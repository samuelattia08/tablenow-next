"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { storeSession } from "@/lib/use-stored-account";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function PartnerLoginPage() {
  const login = useAction(api.auth.partnerLogin);
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email, password });
      storeSession("partners", result.token);
      router.push("/partner/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="card mt-8 p-6">
          <h1 className="text-xl font-semibold">{t("partner.login.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("partner.login.sub")}</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t("login.email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-sm"
                placeholder="votre-club@tablenow.app"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {t("login.password")}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 w-full py-2.5 text-sm disabled:opacity-60"
            >
              {loading ? t("login.submitting") : t("login.submit")}
            </button>
          </form>

          {process.env.NEXT_PUBLIC_TABLENOW_ENABLE_DEMO === "true" && (
          <p className="mt-5 text-center text-xs text-muted">
            {t("partner.login.demo")} : <strong>club-lenocturne@tablenow.app</strong> /{" "}
            <strong>club-klub7@tablenow.app</strong> —{" "}
            {t("login.password").toLowerCase()} <strong>demo1234</strong>
          </p>
          )}
        </div>
      </div>
    </main>
  );
}
