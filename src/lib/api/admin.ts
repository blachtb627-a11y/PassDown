import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type AdminAccount = {
  id: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  isAdmin: boolean;
};

type AdminApiResponse = { accounts?: AdminAccount[]; success?: boolean; error?: string };

// supabase-js's functions.invoke() throws a generic "non-2xx status code"
// error on failure and leaves `data` null — it does NOT parse the function's
// own JSON error body. Without this, every failure (self-delete blocked, not
// authorized, a real DB error) all looked like the same unhelpful message.
async function invokeAdminApi(body: Record<string, unknown>): Promise<AdminApiResponse> {
  const { data, error } = await supabase.functions.invoke<AdminApiResponse>('admin-api', { body });

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

  if (data?.error) throw new Error(data.error);
  return data ?? {};
}

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
  const data = await invokeAdminApi({ action: 'list' });
  return data.accounts ?? [];
}

export async function deleteAccount(userId: string): Promise<void> {
  await invokeAdminApi({ action: 'delete', userId });
}

export async function grantAdmin(userId: string): Promise<void> {
  await invokeAdminApi({ action: 'grant_admin', userId });
}

export async function revokeAdmin(userId: string): Promise<void> {
  await invokeAdminApi({ action: 'revoke_admin', userId });
}
