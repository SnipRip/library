"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

const DEV_ADMIN_TOKEN = "dev-admin-token";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.replace('/auth/login');
          return;
        }

        // Dev-only fast path for local frontend work without the API server.
        if (process.env.NODE_ENV !== 'production' && token === DEV_ADMIN_TOKEN) {
          if (!cancelled) setReady(true);
          return;
        }

        const meRes = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) {
          localStorage.removeItem('token');
          router.replace('/auth/login');
          return;
        }
        await meRes.json().catch(() => null);
        if (!cancelled) setReady(true);
      } catch {
        localStorage.removeItem('token');
        router.replace('/auth/login');
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!ready) return null;
  return <>{children}</>;
}
