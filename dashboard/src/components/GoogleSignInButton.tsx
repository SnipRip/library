"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdInitializeOptions = {
  client_id: string;
  callback: (resp: GoogleCredentialResponse) => void;
};

type GoogleIdRenderButtonOptions = {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: number;
};

type GoogleAccountsId = {
  initialize: (options: GoogleIdInitializeOptions) => void;
  renderButton: (parent: HTMLElement, options: GoogleIdRenderButtonOptions) => void;
};

type GoogleAccounts = {
  id: GoogleAccountsId;
};

type GoogleIdentity = {
  accounts: GoogleAccounts;
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export default function GoogleSignInButton({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    const ensureScript = () => {
      const existing = document.querySelector('script[data-google-gsi]') as HTMLScriptElement | null;
      if (existing) return existing;
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = '1';
      document.head.appendChild(script);
      return script;
    };

    const init = async () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        onErrorRef.current('Google sign-in failed to load');
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: GoogleCredentialResponse) => {
            try {
              const credential = resp?.credential;
              if (!credential) {
                onErrorRef.current('Google sign-in failed');
                return;
              }
              const r = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
              });
              const b = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(b.message || 'Google sign-in failed');
              localStorage.setItem('token', b.token);
              router.push('/');
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Google sign-in failed';
              onErrorRef.current(msg);
            }
          },
        });

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(containerRef.current, {
            theme: 'outline',
            size: 'large',
            width: 360,
          });
        }
      } catch {
        onErrorRef.current('Google sign-in failed to initialize');
      }

    };

    const script = ensureScript();
    // If the script is already loaded, initialize immediately.
    if (window.google?.accounts?.id) {
      init();
    } else {
      script.onload = init;
    }

    return () => {
      cancelled = true;
    };
  }, [router]);

  const isConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  if (!isConfigured) {
    return (
      <button
        type="button"
        onClick={() => onError('Google sign-in is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID)')}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12 }}
      >
        Continue with Google
      </button>
    );
  }

  return <div ref={containerRef} />;
}
