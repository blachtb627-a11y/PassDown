import { supabase } from '../supabase';
import { Tables } from '../database.types';

export type NotificationType = 'follow' | 'like' | 'comment' | 'made_this';

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorId: string | null;
  actorName: string;
  actorAvatarUrl?: string;
  recipeId?: string;
  recipeTitle?: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationRow = Pick<Tables<'notifications'>, 'id' | 'type' | 'actor_id' | 'recipe_id' | 'is_read' | 'created_at'> & {
  actor: Pick<Tables<'profiles'>, 'full_name' | 'avatar_url'> | null;
  recipe: Pick<Tables<'recipes'>, 'title'> | null;
};

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    actorId: row.actor_id,
    actorName: row.actor?.full_name || 'Someone',
    actorAvatarUrl: row.actor?.avatar_url ?? undefined,
    recipeId: row.recipe_id ?? undefined,
    recipeTitle: row.recipe?.title ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

// created_by the notify_on_*() triggers in ..._add_notifications.sql, never
// inserted directly by the client — see that migration for why.
export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, actor_id, recipe_id, is_read, created_at, actor:profiles!notifications_actor_id_fkey(full_name, avatar_url), recipe:recipes(title)'
    )
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as unknown as NotificationRow[]).map(mapNotification);
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

// Fires the instant a trigger inserts a new notification row (requires
// `notifications` in the supabase_realtime publication, added in
// ..._add_notifications.sql), so the bell's unread badge updates live
// instead of only after the next manual refresh. Callers just need to know
// *that* one arrived, not its content — the badge only shows a count, and
// the full list is re-fetched with its joins whenever NotificationsScreen
// itself is opened.
export function subscribeToNotifications(userId: string, onInsert: () => void): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
      () => onInsert()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
