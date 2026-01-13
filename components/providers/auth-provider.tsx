"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { checkAuth } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, isLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthentication = async () => {
      setLoading(true);
      const result = await checkAuth();
      if (result && result.authenticated && result.user) {
        setUser(result.user);
      } else {
        setUser(null);
        if (
          !pathname.startsWith("/login") &&
          !pathname.startsWith("/register")
        ) {
          router.push("/login");
        }
      }
      setLoading(false);
    };

    checkAuthentication();
  }, [setUser, setLoading, router, pathname]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (pathname === "/login" || pathname === "/register") {
        router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  return <>{children}</>;
}
