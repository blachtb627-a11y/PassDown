import { Platform } from 'react-native';
import { supabase } from '../supabase';

function guessExtension(uri: string): string {
  const match = /\.(\w+)(?:\?.*)?$/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// Photos come straight off a phone camera or library picker uncompressed
// beyond expo-image-picker's own JPEG quality setting, which does nothing
// about resolution — a modern phone photo can be 12+ megapixels, several MB,
// just to render as a few-hundred-pixel card thumbnail. That's the single
// biggest cause of a slow-feeling feed: every recipe card fetches one of
// these full-size files. Downscaling here (web only — no canvas on native,
// and no image-resize library is installable in this sandbox) fixes it for
// every future upload without touching how images are displayed.
async function resizeForWeb(blob: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return blob;

  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return blob;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const resized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    return resized ?? blob;
  } finally {
    bitmap.close();
  }
}

// Works identically for native file:// URIs and web blob:/data: URIs from
// expo-image-picker — fetch+blob is supported on both, unlike expo-file-system's
// File API, which is native-only and no-ops on web.
export async function uploadPhoto(localUri: string, ownerId: string): Promise<string> {
  const response = await fetch(localUri);
  let blob = await response.blob();
  let extension = guessExtension(localUri);

  if (Platform.OS === 'web') {
    try {
      const original = blob;
      blob = await resizeForWeb(blob);
      if (blob !== original) extension = 'jpg';
    } catch {
      // If resizing fails for any reason, fall back to uploading the original.
    }
  }

  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from('recipe-photos')
    .upload(path, blob, { contentType: blob.type || `image/${extension}` });
  if (error) throw error;

  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path);
  return data.publicUrl;
}
