import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import client from '../api/client';

const GROQ_API_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ||
  process.env.GROQ_API_KEY ||
  Constants.expoConfig?.extra?.GROQ_API_KEY ||
  (Constants.manifest?.extra as any)?.GROQ_API_KEY;

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are AgriNex AI, a multilingual agricultural expert assistant.
You help farmers with:
- crop diseases
- fertilizers
- irrigation
- soil health
- organic farming
- weather guidance
- pest control
- yield improvement

You can speak fluently in:
English, Tamil, Malayalam, Telugu, and Hindi.

Always reply in the same language used by the farmer.

Keep answers:
- practical
- short
- accurate
- farmer friendly.`;

export interface AIServiceResponse {
  text: string;
  conversationId?: string;
}

// Timeout fetch helper
async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number }) {
  const { timeout = 30000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function retryRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[groqService] Attempt ${attempt} failed:`, error);
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
  throw lastError;
}

export async function sendMessage(
  message: string,
  conversationId: string,
  imageUri?: string,
  history: string[] = []
): Promise<string> {
  const trimmed = message.trim();
  if (!trimmed && !imageUri) {
    return 'Please provide a question or attach an image so I can help you.';
  }

  // Use direct Groq client-side when key is available
  if (GROQ_API_KEY && !imageUri) {
    try {
      return await retryRequest(() => streamGroqResponse(trimmed, history), 2, 1200);
    } catch (error) {
      console.warn('[groqService] Direct Groq send failed, trying backend next...', error);
    }
  }

  // Fallback to backend route
  const payload: any = {
    message: trimmed || 'Analyze this crop image',
    conversation_id: conversationId,
  };
  if (imageUri) {
    payload.image_url = imageUri;
  }

  try {
    const response = await retryRequest(() => client.post('/ai/chat', payload), 2, 1200);
    return response.data?.message || response.data?.reply || 'Sorry, I could not process that request.';
  } catch (backendError) {
    console.warn('[groqService] Backend chat also failed:', backendError);
    return '⚠️ **AI service temporarily unavailable.**\n\nPlease check your internet connection and try again in a moment. Your question has been saved.';
  }
}

export async function analyzeCropImage(imageUri: string) {
  let base64 = '';
  try {
    console.log('[groqService] Original imageUri:', imageUri);

    // Normalize URI for Android content:// URIs
    let localUri = imageUri;

    if (imageUri.startsWith('content://')) {
      const fileName = `crop_${Date.now()}.jpg`;
      const destUri = `${FileSystem.cacheDirectory}${fileName}`;
      console.log('[groqService] Copying content:// to:', destUri);
      await FileSystem.copyAsync({ from: imageUri, to: destUri });
      localUri = destUri;
    } else if (!imageUri.startsWith('file://')) {
      localUri = `file://${imageUri}`;
    }

    console.log('[groqService] Final localUri:', localUri);

    const fileInfo = await FileSystem.getInfoAsync(localUri);
    console.log('[groqService] File info:', JSON.stringify(fileInfo));

    if (!fileInfo.exists) {
      throw new Error('File does not exist: ' + localUri);
    }

    base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('[groqService] base64 length:', base64.length);

  } catch (e) {
    console.error('[groqService] Failed to read image:', e);
    throw new Error('Unable to read selected crop image file.');
  }

  const dataUrl = `data:image/jpeg;base64,${base64}`;

  // Attempt backend analysis first
  try {
    const response = await retryRequest(() =>
      client.post('/ai/detect-disease', { image_url: dataUrl }, { timeout: 10000 })
    );
    if (response.data) {
      return response.data;
    }
  } catch (backendError) {
    console.warn('[groqService] Backend crop analysis failed, running direct Groq Vision fallback...', backendError);
  }

  // Direct Groq Vision Fallback using llama-3.2-11b-vision-preview
  if (GROQ_API_KEY) {
    try {
      const prompt = `Analyze this crop leaf photo. Check if it is a crop leaf.
Return a valid JSON object ONLY (do not include markdown wrapping like \`\`\`json). The JSON must have these exact keys:
{
  "is_valid_crop": true,
  "rejection_reason": "",
  "crop_type": "crop name",
  "disease_name": "disease name or Healthy Crop",
  "confidence": 92.5,
  "severity_level": "Healthy or Low or Moderate or Severe",
  "symptoms": "bullet list of symptoms",
  "treatment": "chemical pesticides recommendations",
  "organic_treatment": "organic solutions",
  "yield_impact": "potential yield impact estimate",
  "recovery_steps": "steps to recover",
  "pro_tips": "practical diagnostic advice"
}`;

      const response = await fetchWithTimeout(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
        timeout: 12000,
      });

      if (response.ok) {
        const data = await response.json();
        const jsonContent = data.choices?.[0]?.message?.content;
        if (jsonContent) {
          return JSON.parse(jsonContent.trim());
        }
      }
    } catch (visionError) {
      console.error('[groqService] Direct Groq Vision analysis also failed:', visionError);
    }
  }

  throw new Error('Connection timed out. Please check your internet connection.');
}

export async function streamGroqResponse(
  message: string,
  history: string[] = [],
  onProgress?: (text: string) => void
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-8).map((item) => ({ role: 'user', content: item })),
    { role: 'user', content: message },
  ];

  const response = await fetchWithTimeout(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 1024,
      stream: false,
    }),
    timeout: 30000,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from Groq API');
  }

  const trimmedResult = content.trim();
  onProgress?.(trimmedResult);
  return trimmedResult;
}

export async function generateTreatment(diseaseName: string, cropType: string): Promise<string> {
  const prompt = `Provide a detailed agricultural pathology treatment report for the disease "${diseaseName}" affecting the crop "${cropType}".
Provide:
1. Chemical treatment recommendations
2. Organic treatment pathways
3. Preventive maintenance steps
Keep it concise, professional, with bullet points and emojis.`;

  if (GROQ_API_KEY) {
    try {
      return await retryRequest(() => streamGroqResponse(prompt), 2, 800);
    } catch (e) {
      console.warn('[groqService] generateTreatment direct failed, falling back to mock or backend', e);
    }
  }

  return `### Remediation for ${diseaseName} on ${cropType}
- **Chemical Treatment**: Apply standard fungicides or pesticides matching ${diseaseName}.
- **Organic Pathways**: Spray organic neem oil or copper soap.
- **Prevention**: Rotate crops regularly and maintain good spacing.`;
}
