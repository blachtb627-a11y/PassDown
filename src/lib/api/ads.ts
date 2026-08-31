import { Platform } from 'react-native';
import { supabase } from '../supabase';
import { Tables } from '../database.types';
import { resizeForWeb } from './photos';

export type AdMediaType = 'image' | 'video';

export type Ad = {
  id: string;
  companyName: string;
  mediaUrl: string;
  mediaType: AdMediaType;
  linkUrl?: string;
  targetViewCount?: number;
  viewCount: number;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
  createdAt: string;
};

function mapAd(row: Tables<'ads'>): Ad {
  return {
    id: row.id,
    companyName: row.company_name,
    mediaUrl: row.media_url,
    mediaType: row.media_type as AdMediaType,
    linkUrl: row.link_url ?? undefined,
    targetViewCount: row.target_view_count ?? undefined,
    viewCount: row.view_count,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// RLS only returns rows that are currently eligible to run (active, started,
// not expired, under any view cap) — see ..._add_ads.sql. Picking randomly
// among them, rather than always the newest or oldest, gives every running
// ad a roughly even share of impressions instead of one dominating.
export async function fetchActiveAd(): Promise<Ad | null> {
  const { data, error } = await supabase.from('ads').select('*');
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const chosen = data[Math.floor(Math.random() * data.length)];
  return mapAd(chosen);
}

// Safe to call from any signed-in user — goes through a function that can
// only ever add exactly 1 to this one ad's view_count (see
// record_ad_view() in ..._add_ads.sql), never an arbitrary update.
export async function recordAdView(adId: string): Promise<void> {
  const { error } = await supabase.rpc('record_ad_view', { ad_id: adId });
  if (error) throw error;
}

// Admin-only (enforced by RLS): every ad regardless of whether it's
// currently eligible to run, for the Ad Deployment management list.
export async function fetchAllAdsForAdmin(): Promise<Ad[]> {
  const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapAd);
}

export type CreateAdInput = {
  companyName: string;
  mediaUrl: string;
  mediaType: AdMediaType;
  linkUrl?: string;
  targetViewCount?: number;
  durationDays: number;
};

export async function createAd(input: CreateAdInput): Promise<Ad> {
  const endsAt = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('ads')
    .insert({
      company_name: input.companyName,
      media_url: input.mediaUrl,
      media_type: input.mediaType,
      link_url: input.linkUrl ?? null,
      target_view_count: input.targetViewCount ?? null,
      ends_at: endsAt,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapAd(data);
}

export async function setAdActive(adId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('ads').update({ is_active: isActive }).eq('id', adId);
  if (error) throw error;
}

export async function deleteAd(adId: string): Promise<void> {
  const { error } = await supabase.from('ads').delete().eq('id', adId);
  if (error) throw error;
}

function guessExtension(uri: string): string {
  const match = /\.(\w+)(?:\?.*)?$/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

// Mirrors uploadPhoto (same fetch+blob approach works for native file:// and
// web blob:/data: URIs alike), uploading to the separate ad-media bucket
// instead — admin-only per that bucket's own storage policies. Images still
// get downscaled for web; video is uploaded as-is since there's no
// lightweight way to transcode it client-side.
export async function uploadAdMedia(localUri: string, mediaType: AdMediaType, adminId: string): Promise<string> {
  const response = await fetch(localUri);
  let blob = await response.blob();
  let extension = guessExtension(localUri);

  if (mediaType === 'image' && Platform.OS === 'web') {
    try {
      const original = blob;
      blob = await resizeForWeb(blob);
      if (blob !== original) extension = 'jpg';
    } catch {
      // If resizing fails for any reason, fall back to uploading the original.
    }
  }

  const path = `${adminId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from('ad-media')
    .upload(path, blob, { contentType: blob.type || `${mediaType}/${extension}` });
  if (error) throw error;

  const { data } = supabase.storage.from('ad-media').getPublicUrl(path);
  return data.publicUrl;
}
