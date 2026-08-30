import { supabase } from '../supabase';
import { Author } from '../../types/recipe';
import { Tables } from '../database.types';
import { mapAuthor } from './mappers';

type FollowProfileRow = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'username' | 'avatar_url' | 'bio'>;

export async function fetchFollowedAuthorIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');
  if (error) throw error;
  return data.map((row) => row.followee_id);
}

export async function fetchPendingOutgoingFollowIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return data.map((row) => row.followee_id);
}

export async function fetchIncomingFollowRequests(userId: string): Promise<Author[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profile:profiles!follows_follower_id_fkey(id, full_name, username, avatar_url, bio)')
    .eq('followee_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return (data as unknown as { profile: FollowProfileRow | null }[])
    .filter((row): row is { profile: FollowProfileRow } => !!row.profile)
    .map((row) => mapAuthor(row.profile, row.profile.id));
}

export async function fetchFollowers(userId: string): Promise<Author[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profile:profiles!follows_follower_id_fkey(id, full_name, username, avatar_url, bio)')
    .eq('followee_id', userId)
    .eq('status', 'accepted');
  if (error) throw error;
  return (data as unknown as { profile: FollowProfileRow | null }[])
    .filter((row): row is { profile: FollowProfileRow } => !!row.profile)
    .map((row) => mapAuthor(row.profile, row.profile.id));
}

export async function fetchFollowing(userId: string): Promise<Author[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profile:profiles!follows_followee_id_fkey(id, full_name, username, avatar_url, bio)')
    .eq('follower_id', userId)
    .eq('status', 'accepted');
  if (error) throw error;
  return (data as unknown as { profile: FollowProfileRow | null }[])
    .filter((row): row is { profile: FollowProfileRow } => !!row.profile)
    .map((row) => mapAuthor(row.profile, row.profile.id));
}

// Sends a follow request — always starts pending, and only takes effect
// once the target accepts it (see acceptFollowRequest below).
export async function sendFollowRequest(followerId: string, followeeId: string): Promise<void> {
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, followee_id: followeeId });
  if (error) throw error;
}

// Removes a follow row outright — used for unfollowing an accepted follow,
// cancelling your own outgoing request, or declining someone else's
// incoming request. RLS allows either side of the row to delete it.
export async function removeFollow(followerId: string, followeeId: string): Promise<void> {
  const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId);
  if (error) throw error;
}

export async function acceptFollowRequest(followerId: string, followeeId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .update({ status: 'accepted' })
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId);
  if (error) throw error;
}

export async function fetchProfileWithCounts(userId: string): Promise<Author | null> {
  const [{ data: profileRow, error: profileError }, followerCountRes, followingCountRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, username, avatar_url, bio').eq('id', userId).maybeSingle(),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followee_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('followee_id', { count: 'exact', head: true })
      .eq('follower_id', userId)
      .eq('status', 'accepted'),
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
