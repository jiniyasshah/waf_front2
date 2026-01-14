"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { logout as apiLogout } from "@/lib/api"; // Import the API logout function
import {
  Shield,
  LayoutDashboard,
  Globe,
  FileText,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Firewall Rules", href: "/rules", icon: FileText },
  { name: "Traffic Logs", href: "/logs", icon: ScrollText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // Rename the store action to avoid confusion
  const { user, logout: storeLogout } = useAuthStore();

  const handleLogout = async () => {
    try {
      // 1. Call Backend to clear cookies
      await apiLogout();

      // 2. Clear Client State
      storeLogout();

      toast.success("Signed out successfully");

      // 3. Redirect to Login
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Force redirect even if API fails
      storeLogout();
      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border/40 bg-[#050505] text-foreground">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border/40 bg-[#0a0a0a]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white leading-none">
              MiniShield
            </span>
            <span className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
              <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <div className="px-3 mb-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Platform
          </h3>
        </div>

        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(99,102,241,0.1)]"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer / User Profile */}
      <div className="border-t border-border/40 p-4 bg-[#0a0a0a]/30">
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-medium text-foreground truncate">
              {user?.name || "Admin User"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user?.email || "admin@waf.com"}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 h-8"
          onClick={handleLogout} // Updated Handler
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
