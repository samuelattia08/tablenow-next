"use client";

import { Suspense, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { storeSession } from "@/lib/use-stored-account";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ClientBackLink } from "@/components/ClientBackLink";
import { clientAuthHref, clientDestination } from "@/lib/client-navigation";

function ClientSignupPage() {
  const signup = useAction(api.auth.clientSignup);
  const router = useRouter();
  const destination = clientDestination(useSearchParams().get("next"));
  const { t, lang } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signup({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        lang,
      });
      storeSession("clients", result.token);
      router.replace(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 sm:py-20">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <ClientBackLink href="/" label={t("nav.home")} />
        <div className="card mt-8 p-5 sm:p-6">
          <h1 className="text-xl font-semibold">{t("signup.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("signup.sub")}</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="text-sm font-medium">
                  {t("signup.firstName")}
                </label>
                <input
                  id="firstName"
                autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-field mt-1.5 w-full px-3 py-2.5 text-base"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="text-sm font-medium">
                  {t("signup.lastName")}
                </label>
                <input
                  id="lastName"
                autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field mt-1.5 w-full px-3 py-2.5 text-base"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t("signup.email")}
              </label>
              <input
                id="email"
                autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-base"
                placeholder="toi@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium">
                {t("signup.phone")}
              </label>
              <input
                id="phone"
                autoComplete="tel"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-base"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {t("signup.password")}
              </label>
              <input
                id="password"
                autoComplete="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-base"
                placeholder={t("signup.passwordHint")}
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
              className="btn-primary mt-2 w-full py-2.5 min-h-11 text-sm disabled:opacity-60"
            >
              {loading ? t("signup.submitting") : t("signup.submit")}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {t("signup.hasAccount")}{" "}
            <Link href={clientAuthHref("login", destination)} replace className="text-blue hover:underline">
              {t("signup.login")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ClientSignupPage />
    </Suspense>
  );
}
