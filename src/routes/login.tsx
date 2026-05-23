import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Package } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/inventory" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Login — InventoryHub"; }, []);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrors({});
    if (!username) return setErrors({ username: "Username is required" });
    if (!password) return setErrors({ password: "Password is required" });
    setLoading(true);

    // Check whether username exists
    const { data: exists, error: rpcErr } = await supabase.rpc("username_exists", { _username: username });
    if (rpcErr) {
      setLoading(false);
      toast.error(rpcErr.message);
      return;
    }
    if (!exists) {
      setLoading(false);
      setErrors({ username: "Invalid username — no account found." });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);
    if (error) {
      setErrors({ password: "Incorrect password. Please try again." });
      return;
    }
    // Block check
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes.user) {
      const { data: prof } = await supabase.from("profiles").select("blocked").eq("id", userRes.user.id).maybeSingle();
      if (prof?.blocked) {
        await supabase.auth.signOut();
        toast.error("Your account has been blocked. Contact the administrator.");
        return;
      }
    }
    toast.success("Welcome back!");
    navigate({ to: "/inventory" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex items-center gap-2 justify-center mb-6 text-primary">
          <Package className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Welcome back</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="u">Username</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. 234567" />
            {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
          </div>
          <div>
            <Label htmlFor="p">Password</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account? <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}