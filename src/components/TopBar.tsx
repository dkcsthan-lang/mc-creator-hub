import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LayoutDashboard, LogIn, LogOut, MessageSquare, Package, ShieldCheck, ShoppingBag, Sparkles, Store, User as UserIcon } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { useRoles, useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

export function TopBar() {
  const { user } = useSession();
  const { isAdmin, isDesigner } = useRoles();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const role = isAdmin ? "admin" : isDesigner ? "designer" : "customer";

  return (
    <header className="sticky top-0 z-40 w-full glass">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-4">
        <Logo />
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="neon-gradient-text">
                  {role === "admin" ? "Admin" : role === "designer" ? "Designer" : "Creator"} menu
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/notifications"><Bell className="mr-2 h-4 w-4" />Notifications</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/messages"><MessageSquare className="mr-2 h-4 w-4" />Messages</Link></DropdownMenuItem>
                {role === "customer" && (
                  <DropdownMenuItem asChild><Link to="/orders"><Package className="mr-2 h-4 w-4" />Orders</Link></DropdownMenuItem>
                )}
                {role === "designer" && (
                  <>
                    <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/orders"><Package className="mr-2 h-4 w-4" />Orders</Link></DropdownMenuItem>
                  </>
                )}
                {role === "admin" && (
                  <>
                    <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin panel</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild><Link to="/store"><Store className="mr-2 h-4 w-4" />Store</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                {role !== "designer" && role !== "admin" && (
                  <DropdownMenuItem asChild><Link to="/apply"><Sparkles className="mr-2 h-4 w-4" />Apply as designer</Link></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/apply"><Sparkles className="mr-1 h-4 w-4" />Apply</Link></Button>
              <Button asChild variant="outline"><Link to="/browse"><ShoppingBag className="mr-1 h-4 w-4" />Explore</Link></Button>
              <Button asChild className="neon-glow"><Link to="/auth"><LogIn className="mr-1 h-4 w-4" />Sign in</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
