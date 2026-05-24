import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { checkRateLimit, logAuthEvent, recordLoginAttempt } from "@/lib/audit";

export const Route = createFileRoute("/admin-login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (role) throw redirect({ to: "/admin" });
      throw redirect({ to: "/inventory" });
    }
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Admin Login — Item Storage Unit"; }, []);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");
    if (!username || !password) return setError("Username and password are required");
    setLoading(true);

    const rl = await checkRateLimit(username);
    if (rl.locked) {
      setLoading(false);
      await logAuthEvent({ event: "rate_limited", username });
      const mins = Math.ceil((rl.unlocks_in_seconds || 60) / 60);
      return setError(`Too many failed attempts. Try again in ~${mins} minute(s).`);
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (signErr) {
      setLoading(false);
      await recordLoginAttempt(username, false);
      await logAuthEvent({ event: "login_failed", username, metadata: { reason: "admin_login_bad_credentials" } });
      return setError("Invalid credentials.");
    }

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { setLoading(false); return setError("Authentication failed."); }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      await supabase.auth.signOut();
      await logAuthEvent({ event: "blocked_attempt", username, userId: uid, metadata: { reason: "non_admin_attempted_admin_login" } });
      setLoading(false);
      return setError("This account does not have admin privileges.");
    }

    await recordLoginAttempt(username, true);
    await logAuthEvent({ event: "login_success", username, userId: uid, metadata: { via: "admin_login" } });
    setLoading(false);
    toast.success("Welcome, Admin");
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md p-8 shadow-2xl border-slate-700 bg-white">
        <div className="flex items-center gap-2 justify-center mb-6">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Admin Portal</h1>
        </div>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Restricted access. Authorized personnel only.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="u">Admin Username</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="masteradmin" autoComplete="username" />
          </div>
          <div>
            <Label htmlFor="p">Password</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Sign in as Admin"}
          </Button>
        </form>
        <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary mt-6">
          <ArrowLeft className="w-3 h-3" /> Back to user login
        </Link>
      </Card>
    </div>
  );
}