import { supabase } from "@/integrations/supabase/client";

export async function logActivity(params: {
  action: "create" | "update" | "delete";
  itemName?: string | null;
  itemId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      username: profile?.username ?? user.email ?? "unknown",
      action: params.action,
      item_name: params.itemName ?? null,
      item_id: params.itemId ?? null,
      details: params.details ?? null,
    });
  } catch (e) {
    console.error("[activity log]", e);
  }
}