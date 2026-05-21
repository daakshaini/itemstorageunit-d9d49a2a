import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, Package } from "lucide-react";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/inventory" });
  },
  component: SignupPage,
});

function genCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const usernameRe = /^2\d{5}$/;
const passwordRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captcha, setCaptcha] = useState(genCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Sign up — InventoryHub"; }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!usernameRe.test(username))
      e.username = "Username must start with 2 and contain exactly 6 digits (e.g. 234567).";
    if (!passwordRe.test(password))
      e.password = "Password needs uppercase, lowercase, number, special character & min 8 chars.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    if (captchaInput.trim().toUpperCase() !== captcha) e.captcha = "Captcha does not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/inventory`,
        data: { username },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already"))
        toast.error("This username is already registered.");
      else toast.error(error.message);
      setCaptcha(genCaptcha());
      setCaptchaInput("");
      return;
    }
    toast.success("Account created! You can now log in.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex items-center gap-2 justify-center mb-6 text-primary">
          <Package className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Create your account</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. 234567" maxLength={6} />
            {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
          </div>
          <div>
            <Label>Captcha</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="px-4 py-2 rounded-md bg-primary/10 border border-primary/30 font-mono font-bold tracking-[0.4em] text-primary text-lg select-none italic line-through">
                {captcha}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setCaptcha(genCaptcha()); setCaptchaInput(""); }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <Input className="mt-2" placeholder="Enter the captcha above"
              value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} />
            {errors.captcha && <p className="text-xs text-destructive mt-1">{errors.captcha}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Sign up"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
        </p>
      </Card>
    </div>
  );
}