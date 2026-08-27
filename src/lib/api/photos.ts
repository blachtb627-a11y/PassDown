import { supabase } from '../supabase';

function guessExtension(uri: string): string {
  const match = /\.(\w+)(?:\?.*)?$/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

// Works identically for native file:// URIs and web blob:/data: URIs from
// expo-image-picker — fetch+blob is supported on both, unlike expo-file-system's
// File API, which is native-only and no-ops on web.
export async function uploadPhoto(localUri: string, ownerId: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const extension = guessExtension(localUri);
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from('recipe-photos')
    .upload(path, blob, { contentType: blob.type || `image/${extension}` });
  if (error) throw error;

  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path);
  return data.publicUrl;
}
