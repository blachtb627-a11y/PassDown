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

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
