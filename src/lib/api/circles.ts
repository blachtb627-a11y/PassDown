import { supabase } from '../supabase';
import { Author } from '../../types/recipe';
import { Tables } from '../database.types';
import { mapAuthor } from './mappers';

export type CircleSummary = {
  id: string;
  name: string;
  createdBy: string;
  memberCount: number;
};

type MemberProfileRow = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'username' | 'avatar_url' | 'bio'>;

export async function fetchMyCircles(): Promise<CircleSummary[]> {
  const { data: circles, error } = await supabase
    .from('circles')
    .select('id, name, created_by')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (circles.length === 0) return [];

  const { data: memberRows, error: memberError } = await supabase
    .from('circle_members')
    .select('circle_id')
    .in(
      'circle_id',
      circles.map((c) => c.id)
    );
  if (memberError) throw memberError;

  const counts = new Map<string, number>();
  for (const row of memberRows) counts.set(row.circle_id, (counts.get(row.circle_id) ?? 0) + 1);

  return circles.map((c) => ({
    id: c.id,
    name: c.name,
    createdBy: c.created_by,
    memberCount: counts.get(c.id) ?? 0,
  }));
}

export async function fetchCircle(circleId: string): Promise<CircleSummary | null> {
  const { data, error } = await supabase
    .from('circles')
    .select('id, name, created_by')
    .eq('id', circleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, name: data.name, createdBy: data.created_by, memberCount: 0 };
}

export async function createCircle(userId: string, name: string): Promise<CircleSummary> {
  // created_by is deliberately not sent — it defaults to auth.uid() in the
  // database, so it's always computed the same way the RLS check reads it.
  const { data: circle, error } = await supabase
    .from('circles')
    .insert({ name })
    .select('id, name, created_by')
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase
    .from('circle_members')
    .insert({ circle_id: circle.id, user_id: userId, added_by: userId });
  if (memberError) throw memberError;

  return { id: circle.id, name: circle.name, createdBy: circle.created_by, memberCount: 1 };
}

export async function deleteCircle(circleId: string): Promise<void> {
  const { error } = await supabase.from('circles').delete().eq('id', circleId);
  if (error) throw error;
}

export async function fetchCircleMembers(circleId: string): Promise<Author[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('profile:profiles!circle_members_user_id_fkey(id, full_name, username, avatar_url, bio)')
    .eq('circle_id', circleId);
  if (error) throw error;
  return (data as unknown as { profile: MemberProfileRow | null }[])
    .filter((row): row is { profile: MemberProfileRow } => !!row.profile)
    .map((row) => mapAuthor(row.profile, row.profile.id));
}

export async function addCircleMember(circleId: string, userId: string, addedBy: string): Promise<void> {
  const { error } = await supabase
    .from('circle_members')
    .insert({ circle_id: circleId, user_id: userId, added_by: addedBy });
  if (error) throw error;
}

export async function removeCircleMember(circleId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', userId);
  if (error) throw error;
}
