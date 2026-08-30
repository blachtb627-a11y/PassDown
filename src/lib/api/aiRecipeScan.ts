import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '../supabase';
import { resizeForWeb } from './photos';

export type ScannedIngredient = { quantity?: string; unit?: string; item: string };

export type ScannedRecipe = {
  title: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients: ScannedIngredient[];
  steps: string[];
};

// Works for native file:// URIs and web blob:/data: URIs alike (same fetch+blob
// approach already used for photo uploads) — resized on web first, same as a
// normal upload, since the photo only needs to be legible, not full resolution.
async function uriToBase64(uri: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(uri);
  let blob = await response.blob();
  if (Platform.OS === 'web') {
    blob = await resizeForWeb(blob);
  }
  const mediaType = blob.type || 'image/jpeg';

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that photo.'));
    reader.readAsDataURL(blob);
  });

  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return { base64, mediaType };
}

export async function scanRecipePhoto(localUri: string): Promise<ScannedRecipe> {
  const { base64, mediaType } = await uriToBase64(localUri);

  const { data, error } = await supabase.functions.invoke<{ recipe?: ScannedRecipe; error?: string }>(
    'scan-recipe',
    { body: { imageBase64: base64, mediaType } }
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let message = error.message;
      try {
        const responseBody = await error.context.json();
        if (responseBody?.error) message = responseBody.error;
      } catch {
        // response body wasn't JSON — fall back to the generic message above
      }
      throw new Error(message);
    }
    throw error;
  }

  if (!data?.recipe) throw new Error(data?.error ?? 'Could not read that recipe.');
  return data.recipe;
}
