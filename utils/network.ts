/**
 * Network Utilities — Production-grade networking layer
 *
 * Features:
 *  - Exponential backoff with jitter
 *  - Configurable timeout (default 60s for Render cold starts)
 *  - Up to 2 retry attempts on failure
 *  - Detailed console logging for debugging
 */

/**
 * Sleep utility for delays between retries
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay with jitter
 */
const getBackoffDelay = (attempt: number, baseMs = 1000, maxMs = 6000): number => {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * 400;
  return Math.min(exponential + jitter, maxMs);
};

/**
 * Executes an API call with timeout protection and exponential backoff retry.
 *
 * @param apiFn   - The async function to execute
 * @param timeoutMs - Maximum time to wait per attempt (default: 60000ms = 60s)
 * @param maxRetries - Number of retry attempts after first failure (default: 2)
 */
export async function safeApiCall<T>(
  apiFn: () => Promise<T>,
  timeoutMs = 60000,
  maxRetries = 2
): Promise<T> {
  const executeWithTimeout = async (): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      const result = await Promise.race([apiFn(), timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (err) {
      clearTimeout(timeoutId!);
      throw err;
    }
  };

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executeWithTimeout();
    } catch (err: any) {
      lastError = err;

      // Only retry on network timeouts/disconnects or server-side issues (HTTP 500+)
      const shouldRetry = (() => {
        if (err?.message === 'timeout') return true;
        if (err?.response) {
          const status = err.response.status;
          return status >= 500; // 500+ are server errors, 400-499 are client errors
        }
        return true; // No response from server (network failure, cold start connection loss)
      })();

      if (!shouldRetry) {
        console.log(
          `[safeApiCall] Non-retryable error status ${err?.response?.status || 'unknown'}. Aborting retries.`
        );
        throw err;
      }

      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt);
        console.log(
          `[safeApiCall] Attempt ${attempt + 1} failed (${err?.message}). ` +
          `Retrying in ${Math.round(delay)}ms... (${maxRetries - attempt} retries left)`
        );
        await sleep(delay);
      } else {
        console.log(
          `[safeApiCall] All ${maxRetries + 1} attempts failed (${err?.message}). Giving up.`
        );
      }
    }
  }

  throw lastError;
}

/**
 * Checks if the device has an active internet connection.
 * Returns true to prevent aggressive connectivity checks from blocking requests.
 */
export const checkInternet = async (): Promise<boolean> => {
  return true;
};
