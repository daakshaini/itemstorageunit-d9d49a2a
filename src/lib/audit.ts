import { supabase } from "@/integrations/supabase/client";

export type AuthEvent =
  | "login_success"
  | "login_failed"
  | "logout"
  | "blocked_attempt"
  | "rate_limited"
  | "signup";

export async function logAuthEvent(params: {
  event: AuthEvent;
  username?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.rpc("log_auth_event", {
      _event: params.event,
      _username: params.username ?? null,
      _user_id: params.userId ?? null,
      _metadata: (params.metadata ?? null) as never,
    });
  } catch (e) {
    console.error("[auth log]", e);
  }
}

export async function recordLoginAttempt(username: string, success: boolean) {
  try {
    await supabase.from("login_attempts").insert({ username, success });
  } catch (e) {
    console.error("[login attempt]", e);
  }
}

export async function checkRateLimit(username: string) {
  const { data, error } = await supabase.rpc("check_login_rate_limit", { _username: username });
  if (error) return { locked: false, failed_count: 0, unlocks_in_seconds: 0 };
  return data as { locked: boolean; failed_count: number; unlocks_in_seconds: number };
}

export type AdminAction =
  | "block_user"
  | "unblock_user"
  | "delete_user"
  | "delete_item"
  | "promote_admin"
  | "demote_admin";

export async function logAdminAction(params: {
  action: AdminAction;
  targetType: "user" | "item" | "role";
  targetId?: string | null;
  targetLabel?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      admin_username: prof?.username ?? user.email ?? "unknown",
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      target_label: params.targetLabel ?? null,
      details: (params.details ?? null) as never,
    });
  } catch (e) {
    console.error("[admin action]", e);
  }
}