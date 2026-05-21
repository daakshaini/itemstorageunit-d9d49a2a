import { createFileRoute } from "@tanstack/react-router";
import { Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, ShieldCheck, Boxes } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/inventory" });
  },
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-bold text-primary text-lg">
          <Package className="w-6 h-6" />
          InventoryHub
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/login">Login</Link></Button>
          <Button asChild><Link to="/signup">Sign up</Link></Button>
        </div>
      </header>
      <main className="container mx-auto px-6 py-20 text-center max-w-3xl">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
          Manage your inventory <span className="text-primary">securely</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          A private, per-account item storage system. Track part numbers, prices, and quantities — your data stays yours.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Button asChild size="lg"><Link to="/signup">Get Started</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/login">I have an account</Link></Button>
        </div>
        <div className="mt-16 grid sm:grid-cols-3 gap-6 text-left">
          <Feature icon={<ShieldCheck className="w-6 h-6" />} title="Private accounts" desc="Each user only sees their own inventory." />
          <Feature icon={<Boxes className="w-6 h-6" />} title="Item tracking" desc="Part number, name, price, and quantity." />
          <Feature icon={<Package className="w-6 h-6" />} title="Simple UI" desc="Clean blue & white modern design." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-xl bg-white border shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
