import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { usernameToEmail } from "@/hooks/use-auth";

const MASTER_USERNAME = "masteradmin";
const MASTER_PASSWORD = "MasterAdmin@2026";

export const Route = createFileRoute("/api/public/init-master-admin")({
  server: {
    handlers: {
      POST: async () => {
        const email = usernameToEmail(MASTER_USERNAME);
        // Check existing
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("username", MASTER_USERNAME)
          .maybeSingle();

        let userId = existing?.id as string | undefined;
        if (!userId) {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: MASTER_PASSWORD,
            email_confirm: true,
            user_metadata: { username: MASTER_USERNAME },
          });
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          userId = created.user!.id;
          await supabaseAdmin.from("profiles").upsert({ id: userId, username: MASTER_USERNAME, blocked: false });
        }

        await supabaseAdmin.from("user_roles").upsert(
          { user_id: userId, role: "admin" },
          { onConflict: "user_id,role" }
        );

        return Response.json({
          ok: true,
          username: MASTER_USERNAME,
          password: MASTER_PASSWORD,
          userId,
        });
      },
    },
  },
});