import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    // Scoped to the caller's own JWT and RLS — this can only ever confirm
    // whether THIS caller is an admin, never anyone else's status.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const { data: adminRow } = await callerClient
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!adminRow) {
      return json({ error: "Not authorized" }, 403);
    }

    // Only reached after confirming the caller is an admin — safe to use the
    // service role now, which bypasses RLS entirely.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "list") {
      const { data: usersPage, error: listError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) return json({ error: listError.message }, 500);

      const { data: profiles, error: profilesError } = await adminClient
        .from("profiles")
        .select("id, full_name, username, created_at");
      if (profilesError) return json({ error: profilesError.message }, 500);

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const accounts = usersPage.users.map((u) => {
        const profile = profileById.get(u.id);
        return {
          id: u.id,
          email: u.email ?? null,
          fullName: profile?.full_name ?? null,
          username: profile?.username ?? null,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at ?? null,
          emailConfirmedAt: u.email_confirmed_at ?? null,
        };
      });

      return json({ accounts });
    }

    if (action === "delete") {
      const targetUserId = body.userId;
      if (!targetUserId || typeof targetUserId !== "string") {
        return json({ error: "Missing userId" }, 400);
      }
      if (targetUserId === userData.user.id) {
        return json({ error: "You can't delete your own account from here." }, 400);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteError) return json({ error: deleteError.message }, 500);

      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
