import { supabase } from "@/integrations/supabase/client";

export async function logActivity(params: {
  action: "create" | "delete" | "update";
  itemName?: string | null;
  itemId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    await supabase.rpc("log_activity", {
      _action: params.action,
      _item_name: params.itemName ?? undefined,
      _item_id: params.itemId ?? undefined,
      _details: (params.details ?? undefined) as never,
    });
  } catch (e) {
    console.error("[activity log]", e);
  }
}