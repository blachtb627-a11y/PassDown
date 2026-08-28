import { supabase } from '../supabase';
import { Author } from '../../types/recipe';
import { mapAuthor } from './mappers';

export async function fetchFollowedAuthorIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', userId);
  if (error) throw error;
  return data.map((row) => row.followee_id);
}

export async function toggleFollow(
  followerId: string,
  followeeId: string,
  isCurrentlyFollowing: boolean
): Promise<void> {
  if (isCurrentlyFollowing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('follows').insert({ follower_id: followerId, followee_id: followeeId });
    if (error) throw error;
  }
}

export async function fetchProfileWithCounts(userId: string): Promise<Author | null> {
  const [{ data: profileRow, error: profileError }, followerCountRes, followingCountRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, username, avatar_url, bio').eq('id', userId).maybeSingle(),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  if (profileError) throw profileError;
  if (!profileRow) return null;

  return {
    ...mapAuthor(profileRow, userId),
    followerCount: followerCountRes.count ?? 0,
    followingCount: followingCountRes.count ?? 0,
  };
}

export async function searchUsers(query: string, excludeUserId: string): Promise<Author[]> {
  const q = query.trim().replace(/[,()%]/g, '');
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, bio')
    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
    .neq('id', excludeUserId)
    .limit(30);
  if (error) throw error;
  return data.map((row) => mapAuthor(row, row.id));
}

export async function fetchSuggestedUsers(excludeIds: string[]): Promise<Author[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, bio')
    .not('id', 'in', `(${excludeIds.length ? excludeIds.join(',') : 'null'})`)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data.map((row) => mapAuthor(row, row.id));
}

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase.from('profiles').select('id').ilike('username', username);
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return !!data;
}

export type ProfileUpdateInput = {
  fullName: string;
  username: string;
  bio: string;
  avatarUrl?: string;
};

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      username: input.username,
      bio: input.bio,
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
    })
    .eq('id', userId);
  if (error) throw error;
}
