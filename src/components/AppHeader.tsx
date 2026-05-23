import { Link, useNavigate } from "@tanstack/react-router";
import { Package, LogOut, Plus, List, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-admin";

export function AppHeader({ username }: { username?: string | null }) {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate({ to: "/login" });
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/inventory" className="flex items-center gap-2 font-bold text-primary text-lg">
          <Package className="w-6 h-6" />
          Item Storage Unit
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/items/new" activeProps={{ className: "bg-accent" }}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/inventory" activeProps={{ className: "bg-accent" }}>
              <List className="w-4 h-4 mr-1" /> My Inventory
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin" activeProps={{ className: "bg-accent" }}>
                <Shield className="w-4 h-4 mr-1" /> Admin
              </Link>
            </Button>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {username && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              @{username}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>
    </header>
  );
}