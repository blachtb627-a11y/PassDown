import { supabase } from '../supabase';
import { Tables } from '../database.types';

export type CircleMessage = {
  id: string;
  circleId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

function mapCircleMessage(row: Tables<'circle_messages'>): CircleMessage {
  return { id: row.id, circleId: row.circle_id, authorId: row.author_id, text: row.text, createdAt: row.created_at };
}

export async function fetchCircleMessages(circleId: string): Promise<CircleMessage[]> {
  const { data, error } = await supabase
    .from('circle_messages')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(mapCircleMessage);
}

export async function sendCircleMessage(circleId: string, authorId: string, text: string): Promise<CircleMessage> {
  const { data, error } = await supabase
    .from('circle_messages')
    .insert({ circle_id: circleId, author_id: authorId, text })
    .select('*')
    .single();
  if (error) throw error;
  return mapCircleMessage(data);
}

// Delivers every new message posted to this circle (including the caller's
// own, echoed back from another tab/device) as it's inserted. Requires
// circle_messages to be in the supabase_realtime publication, which the
// add_circle_messages migration already does.
export function subscribeToCircleMessages(circleId: string, onInsert: (message: CircleMessage) => void): () => void {
  const channel = supabase
    .channel(`circle-messages-${circleId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'circle_messages', filter: `circle_id=eq.${circleId}` },
      (payload) => onInsert(mapCircleMessage(payload.new as Tables<'circle_messages'>))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
