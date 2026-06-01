import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Modal,
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Dimensions,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { X, Eye, ImageIcon, Camera, Crop, Check, ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/axios';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');
const MAX_IMAGES = 10;

const C = {
    bg: '#0D1B2A',
    surface: '#152032',
    surfaceAlt: '#1C2B3E',
    border: 'rgba(255,255,255,0.08)',
    accent: '#00C97B',
    accentDim: 'rgba(0,201,123,0.15)',
    textPrimary: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.5)',
    danger: '#EF4444',
    overlay: 'rgba(0,0,0,0.85)',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickedImage {
    uri: string;
    width: number;
    height: number;
}

// ─── Crop Modal ───────────────────────────────────────────────────────────────
// Simple aspect-ratio crop: user picks 1:1, 4:3, 16:9 or free, then we
// run ImageManipulator to resize/crop server-side before upload.

const CROP_RATIOS = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
];

interface CropModalProps {
    image: PickedImage;
    onDone: (uri: string) => void;
    onCancel: () => void;
}

function CropModal({ image, onDone, onCancel }: CropModalProps) {
    const [ratioIdx, setRatioIdx] = useState(1); // default 1:1
    const [processing, setProcessing] = useState(false);

    const applyCrop = async () => {
        setProcessing(true);
        try {
            const ratio = CROP_RATIOS[ratioIdx].value;
            let actions: ImageManipulator.Action[] = [];

            if (ratio !== null) {
                const srcW = image.width;
                const srcH = image.height;
                const srcRatio = srcW / srcH;

                let cropW = srcW;
                let cropH = srcH;
                let originX = 0;
                let originY = 0;

                if (srcRatio > ratio) {
                    // source wider than target — crop sides
                    cropH = srcH;
                    cropW = Math.round(srcH * ratio);
                    originX = Math.round((srcW - cropW) / 2);
                } else {
                    // source taller than target — crop top/bottom
                    cropW = srcW;
                    cropH = Math.round(srcW / ratio);
                    originY = Math.round((srcH - cropH) / 2);
                }

                actions = [{ crop: { originX, originY, width: cropW, height: cropH } }];
            }

            // Resize to max 1200px wide to keep uploads light
            actions.push({ resize: { width: 1200 } });

            const result = await ImageManipulator.manipulateAsync(image.uri, actions, {
                compress: 0.85,
                format: ImageManipulator.SaveFormat.JPEG,
            });
            onDone(result.uri);
        } catch (e) {
            Alert.alert('Crop failed', 'Could not process image. Using original.');
            onDone(image.uri);
        } finally {
            setProcessing(false);
        }
    };

    const previewRatio = CROP_RATIOS[ratioIdx].value ?? (image.width / image.height);
    const previewW = SW - 48;
    const previewH = previewW / previewRatio;

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
            <View style={{ flex: 1, backgroundColor: C.bg }}>
                <StatusBar barStyle="light-content" />

                {/* Header */}
                <SafeAreaView>
                    <View style={s.modalHeader}>
                        <TouchableOpacity onPress={onCancel} style={s.iconBtn}>
                            <X color={C.textPrimary} size={20} />
                        </TouchableOpacity>
                        <Text style={s.modalTitle}>Crop Image</Text>
                        <TouchableOpacity
                            onPress={applyCrop}
                            disabled={processing}
                            style={[s.iconBtn, { backgroundColor: C.accentDim }]}
                        >
                            {processing
                                ? <ActivityIndicator color={C.accent} size="small" />
                                : <Check color={C.accent} size={20} />
                            }
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Preview */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                    <View style={{
                        width: previewW,
                        height: Math.min(previewH, SH * 0.5),
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: C.accent,
                    }}>
                        <Image
                            source={{ uri: image.uri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    </View>
                </View>

                {/* Ratio Picker */}
                <SafeAreaView>
                    <View style={s.ratioPicker}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                            <Crop color={C.textMuted} size={14} />
                            <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Aspect Ratio
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {CROP_RATIOS.map((r, i) => (
                                <TouchableOpacity
                                    key={r.label}
                                    onPress={() => setRatioIdx(i)}
                                    style={[s.ratioBtn, ratioIdx === i && s.ratioBtnActive]}
                                >
                                    <Text style={[s.ratioBtnText, ratioIdx === i && { color: C.accent }]}>
                                        {r.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

interface PreviewModalProps {
    images: string[];
    caption: string;
    username: string;
    onClose: () => void;
    onPost: () => void;
    posting: boolean;
}

function PreviewModal({ images, caption, username, onClose, onPost, posting }: PreviewModalProps) {
    const [imgIdx, setImgIdx] = useState(0);

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
            <View style={{ flex: 1, backgroundColor: C.bg }}>
                <StatusBar barStyle="light-content" />

                <SafeAreaView>
                    <View style={s.modalHeader}>
                        <TouchableOpacity onPress={onClose} style={s.iconBtn}>
                            <X color={C.textPrimary} size={20} />
                        </TouchableOpacity>
                        <Text style={s.modalTitle}>Preview Post</Text>
                        <TouchableOpacity
                            onPress={onPost}
                            disabled={posting}
                            style={[s.postBtn, posting && { opacity: 0.6 }]}
                        >
                            {posting
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={s.postBtnText}>Post</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* User row */}
                    <View style={s.previewUserRow}>
                        <View style={s.previewAvatar}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                                {username?.[0]?.toUpperCase() ?? 'F'}
                            </Text>
                        </View>
                        <View>
                            <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 15 }}>{username}</Text>
                            <Text style={{ color: C.textMuted, fontSize: 12 }}>Just now</Text>
                        </View>
                    </View>

                    {/* Caption */}
                    {caption.trim().length > 0 && (
                        <Text style={s.previewCaption}>{caption}</Text>
                    )}

                    {/* Images carousel */}
                    {images.length > 0 && (
                        <View>
                            <FlatList
                                data={images}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(_, i) => String(i)}
                                onMomentumScrollEnd={e => {
                                    setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SW));
                                }}
                                renderItem={({ item }) => (
                                    <Image source={{ uri: item }} style={{ width: SW, height: SW * 0.75 }} resizeMode="cover" />
                                )}
                            />
                            {images.length > 1 && (
                                <View style={s.dotRow}>
                                    {images.map((_, i) => (
                                        <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreatePostScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [caption, setCaption] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [cropTarget, setCropTarget] = useState<PickedImage | null>(null);
    const [cropCallback, setCropCallback] = useState<((uri: string) => void) | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [posting, setPosting] = useState(false);

    // ── Pick from gallery ──────────────────────────────────────────────────────
    const pickFromGallery = useCallback(async () => {
        if (images.length >= MAX_IMAGES) {
            Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} images.`);
            return;
        }
        const remaining = MAX_IMAGES - images.length;

        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
            exif: false,
        });

        if (!result.canceled && result.assets.length > 0) {
            openCropFor(result.assets[0], (croppedUri) => {
                const rest = result.assets.slice(1).map(a => a.uri);
                setImages(prev => [...prev, croppedUri, ...rest].slice(0, MAX_IMAGES));
            });
        }
    }, [images.length]);

    // ── Take photo ─────────────────────────────────────────────────────────────
    const takePhoto = useCallback(async () => {
        if (images.length >= MAX_IMAGES) {
            Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} images.`);
            return;
        }
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission needed', 'Please allow camera access.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            openCropFor({ uri: asset.uri, width: asset.width, height: asset.height }, (croppedUri) => {
                setImages(prev => [...prev, croppedUri].slice(0, MAX_IMAGES));
            });
        }
    }, [images.length]);

    // ── Open crop modal ────────────────────────────────────────────────────────
    const openCropFor = (img: PickedImage, cb: (uri: string) => void) => {
        setCropTarget(img);
        setCropCallback(() => cb);
    };

    const onCropDone = (uri: string) => {
        cropCallback?.(uri);
        setCropTarget(null);
        setCropCallback(null);
    };

    // ── Re-crop existing image ─────────────────────────────────────────────────
    const recropImage = (index: number) => {
        const uri = images[index];
        Image.getSize(uri, (width, height) => {
            openCropFor({ uri, width, height }, (croppedUri) => {
                setImages(prev => {
                    const next = [...prev];
                    next[index] = croppedUri;
                    return next;
                });
            });
        });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // ── Upload image to Cloudinary ────────────────────────────────────────────
    // ⚠️  Replace YOUR_CLOUD_NAME with your Cloudinary cloud name
    // ⚠️  Create a free unsigned upload preset named 'agrinex_posts' in:
    //     Cloudinary Dashboard → Settings → Upload → Upload presets → Add preset
    const uploadToCloudinary = async (uri: string): Promise<string> => {
        const CLOUD_NAME = 'dc6wv28ke';
        const UPLOAD_PRESET = 'agrinex_posts';
        const form = new FormData();
        form.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
        form.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            { method: 'POST', body: form }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message ?? 'Image upload failed');
        }
        const data = await res.json();
        return data.secure_url as string;
    };

    // ── Submit post ────────────────────────────────────────────────────────────
    const submitPost = async () => {
        if (!caption.trim() && images.length === 0) {
            Alert.alert('Empty post', 'Add a caption or at least one image.');
            return;
        }
        setPosting(true);
        try {
            // Step 1: Upload all local images to Cloudinary → get https:// URLs
            let imageUrls: string[] = [];
            if (images.length > 0) {
                imageUrls = await Promise.all(images.map(uri => uploadToCloudinary(uri)));
            }

            // Step 2: POST JSON to backend (matches your schemas.PostCreate)
            await api.post('/posts', {
                content: caption.trim(),
                images: imageUrls,
                image_url: imageUrls[0] ?? null,
            });

            setShowPreview(false);
            router.back();
        } catch (e: any) {
            const msg = e?.response?.data?.detail ?? e?.message ?? 'Something went wrong. Please try again.';
            Alert.alert('Post failed', msg);
        } finally {
            setPosting(false);
        }
    };

    const username = user?.full_name ?? user?.username ?? user?.email ?? 'Farmer';
    const canPost = caption.trim().length > 0 || images.length > 0;

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    {/* ── Header ── */}
                    <View style={s.header}>
                        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
                            <X color={C.textPrimary} size={22} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Create Post</Text>
                        <TouchableOpacity
                            onPress={() => setShowPreview(true)}
                            disabled={!canPost}
                            style={[s.previewBtn, !canPost && { opacity: 0.4 }]}
                        >
                            <Eye color={C.textPrimary} size={16} />
                            <Text style={s.previewBtnText}>Preview</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── User row ── */}
                        <View style={s.userRow}>
                            <View style={s.avatar}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                                    {username[0]?.toUpperCase() ?? 'F'}
                                </Text>
                            </View>
                            <Text style={s.userName}>Post as {username}</Text>
                        </View>

                        {/* ── Caption ── */}
                        <TextInput
                            style={s.captionInput}
                            placeholder="What's happening on your farm?"
                            placeholderTextColor={C.textMuted}
                            multiline
                            value={caption}
                            onChangeText={setCaption}
                            textAlignVertical="top"
                            autoFocus
                        />

                        {/* ── Image grid ── */}
                        {images.length > 0 && (
                            <View style={s.imageGrid}>
                                {images.map((uri, index) => (
                                    <View key={index} style={s.imageThumb}>
                                        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

                                        {/* Remove */}
                                        <TouchableOpacity
                                            onPress={() => removeImage(index)}
                                            style={s.removeBtn}
                                        >
                                            <X color="#fff" size={12} strokeWidth={3} />
                                        </TouchableOpacity>

                                        {/* Re-crop */}
                                        <TouchableOpacity
                                            onPress={() => recropImage(index)}
                                            style={s.cropBtn}
                                        >
                                            <Crop color="#fff" size={12} strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {/* Add more slot */}
                                {images.length < MAX_IMAGES && (
                                    <TouchableOpacity onPress={pickFromGallery} style={s.addMoreBtn}>
                                        <Text style={{ color: C.accent, fontSize: 28, fontWeight: '300' }}>+</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* ── Bottom bar ── */}
                    <View style={s.bottomBar}>
                        <Text style={s.imageCount}>{images.length}/{MAX_IMAGES} images</Text>
                        <View style={s.bottomActions}>
                            <TouchableOpacity onPress={pickFromGallery} style={s.mediaBtn}>
                                <ImageIcon color={C.accent} size={18} />
                                <Text style={s.mediaBtnText}>Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={takePhoto} style={s.mediaBtn}>
                                <Camera color={C.accent} size={18} />
                                <Text style={s.mediaBtnText}>Camera</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* ── Crop Modal ── */}
            {cropTarget && (
                <CropModal
                    image={cropTarget}
                    onDone={onCropDone}
                    onCancel={() => { setCropTarget(null); setCropCallback(null); }}
                />
            )}

            {/* ── Preview Modal ── */}
            {showPreview && (
                <PreviewModal
                    images={images}
                    caption={caption}
                    username={username}
                    onClose={() => setShowPreview(false)}
                    onPost={submitPost}
                    posting={posting}
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const THUMB = (SW - 40 - 8 * 2) / 3; // 3-column grid

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    headerTitle: {
        color: C.textPrimary,
        fontSize: 17,
        fontWeight: '700',
    },
    previewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.surfaceAlt,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
    },
    previewBtnText: {
        color: C.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },

    // User
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: C.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        color: C.textPrimary,
        fontSize: 15,
        fontWeight: '700',
    },

    // Caption
    captionInput: {
        color: C.textPrimary,
        fontSize: 16,
        lineHeight: 24,
        minHeight: 120,
        fontWeight: '400',
    },

    // Image grid
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
    imageThumb: {
        width: THUMB,
        height: THUMB,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: C.surfaceAlt,
    },
    removeBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cropBtn: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addMoreBtn: {
        width: THUMB,
        height: THUMB,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: C.accent,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: C.accentDim,
    },

    // Bottom bar
    bottomBar: {
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: C.surface,
        gap: 10,
    },
    imageCount: {
        color: C.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    bottomActions: {
        flexDirection: 'row',
        gap: 12,
    },
    mediaBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: C.accentDim,
        borderWidth: 1,
        borderColor: C.accent,
        borderRadius: 14,
        paddingVertical: 12,
    },
    mediaBtnText: {
        color: C.accent,
        fontSize: 14,
        fontWeight: '700',
    },

    // Shared modal
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    modalTitle: {
        color: C.textPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: C.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Crop modal
    ratioPicker: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 16,
    },
    ratioBtn: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: C.border,
        backgroundColor: C.surfaceAlt,
    },
    ratioBtnActive: {
        borderColor: C.accent,
        backgroundColor: C.accentDim,
    },
    ratioBtnText: {
        color: C.textMuted,
        fontSize: 13,
        fontWeight: '700',
    },

    // Post button
    postBtn: {
        backgroundColor: C.accent,
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    postBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },

    // Preview modal
    previewUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
    },
    previewAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewCaption: {
        color: C.textPrimary,
        fontSize: 15,
        lineHeight: 22,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    dotRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.textMuted,
    },
    dotActive: {
        backgroundColor: C.accent,
        width: 16,
    },
});
