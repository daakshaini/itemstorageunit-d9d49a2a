import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        if (!cancel) { setIsAdmin(false); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancel) { setIsAdmin(!!data); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  return { isAdmin, loading };
}