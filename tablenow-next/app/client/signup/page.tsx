"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ClientSignupPage() {
  const signup = useMutation(api.clients.signup);
  const router = useRouter();
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
      localStorage.setItem("tablenow_client_id", result.clientId);
      router.push("/client/reservations");
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
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-field mt-1.5 w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="text-sm font-medium">
                  {t("signup.lastName")}
                </label>
                <input
                  id="lastName"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field mt-1.5 w-full px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t("signup.email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-sm"
                placeholder="toi@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium">
                {t("signup.phone")}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-sm"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {t("signup.password")}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1.5 w-full px-3 py-2.5 text-sm"
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
              className="btn-primary mt-2 w-full py-2.5 text-sm disabled:opacity-60"
            >
              {loading ? t("signup.submitting") : t("signup.submit")}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {t("signup.hasAccount")}{" "}
            <Link href="/client/login" className="text-blue hover:underline">
              {t("signup.login")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
