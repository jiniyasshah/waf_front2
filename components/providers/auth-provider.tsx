"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { checkAuth } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, isLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // 1. INITIAL CHECK: Run ONLY on mount (first load)
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const result = await checkAuth();
        if (result && result.authenticated && result.user) {
          setUser(result.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser, setLoading]); // Removed 'pathname' so this doesn't run on tab switch

  // 2. ROUTE PROTECTION: Run on path change
  useEffect(() => {
    if (isLoading) return; // Wait for initial check to finish

    const isAuthPage =
      pathname.startsWith("/login") || pathname.startsWith("/register");

    if (isAuthenticated) {
      // If logged in, kick out of login/register pages
      if (isAuthPage) {
        router.push("/");
      }
    } else {
      // If NOT logged in, kick out of protected pages
      if (!isAuthPage) {
        router.push("/login");
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  return <>{children}</>;
}
