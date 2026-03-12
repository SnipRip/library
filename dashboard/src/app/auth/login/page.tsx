"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { API_BASE_URL } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Login failed");
      if (typeof window !== "undefined") localStorage.setItem("token", body.token);
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <DottedGlowBackground
        className={styles.bg}
        opacity={1}
        gap={10}
        radius={1.6}
        colorLightVar="--color-neutral-500"
        glowColorLightVar="--color-neutral-600"
        colorDarkVar="--color-neutral-500"
        glowColorDarkVar="--color-sky-800"
        backgroundOpacity={0}
        speedMin={0.3}
        speedMax={1.6}
        speedScale={1}
      />

      <main className={styles.container}>
        <div className={styles.brandOutside}>Aedify Classes & Library</div>

        <div className={styles.card}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue to your dashboard</p>

          <form onSubmit={submit} className={styles.form}>
            <label className={styles.label}>
              Email or username
              <input
                placeholder="you@school.edu or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                type="text"
                required
              />
            </label>

            <label className={styles.label}>
              Password
              <div className={styles.passwordWrap}>
                <input
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  type={showPassword ? "text" : "password"}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className={styles.rowBetween}>
              <span className={styles.smallLink} />
              <span className={styles.smallLink} />
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

