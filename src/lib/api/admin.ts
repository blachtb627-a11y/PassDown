import { supabase } from '../supabase';

export type AdminAccount = {
  id: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
};

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function fetchAllAccounts(): Promise<AdminAccount[]> {
  const { data, error } = await supabase.functions.invoke<{ accounts: AdminAccount[]; error?: string }>(
    'admin-api',
    { body: { action: 'list' } }
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.accounts ?? [];
}

export async function deleteAccount(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>('admin-api', {
    body: { action: 'delete', userId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
