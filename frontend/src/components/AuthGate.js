"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getApiUrl } from "@/lib/auth";

export default function AuthGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("loom:token");
        if (!token) {
          if (pathname !== "/login") router.replace("/login");
          return;
        }
        // validate token and hydrate user
        const res = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // invalid token: clear and redirect to login
          localStorage.removeItem("loom:token");
          localStorage.removeItem("loom:user");
          localStorage.removeItem("loom:user_email");
          if (pathname !== "/login") router.replace("/login");
          return;
        }
        const data = await res.json();
        if (data?.user) {
          localStorage.setItem("loom:user", JSON.stringify(data.user));
          if (data.user.correo) localStorage.setItem("loom:user_email", data.user.correo);
        }
      } catch {
        // network or other error -> do nothing, allow page but could degrade
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Verificando sesión...
      </div>
    );
  }
  return children;
}
