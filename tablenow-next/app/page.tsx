"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ChooserPage() {
  const { t } = useLanguage();

  return (
    <main className="nightlife-hero flex min-h-svh flex-1 flex-col px-5 sm:px-8">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 py-5">
        <span className="font-display text-xl font-bold">TABLE <span className="gradient-text">NOW</span></span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/client/login" className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-bg/70 px-3 text-sm hover:border-blue sm:px-4"><span className="sm:hidden">{t("login.title")}</span><span className="hidden sm:inline">{t("chooser.client")}</span></Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end pt-36 pb-10 sm:justify-center sm:py-24">
        <h1 className="max-w-3xl font-display text-[clamp(2.75rem,9vw,6rem)] leading-[1.04] font-bold tracking-tight">{t("hero.title")}</h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-200 sm:text-lg">{t("hero.subtitle")}</p>
        <Link href="/explore" className="btn-primary mt-7 inline-flex min-h-12 w-full items-center justify-center px-6 sm:w-auto sm:self-start">
          {t("hero.explore")}
        </Link>
      </div>
      <footer className="hero-footer mx-auto w-full max-w-6xl border-t border-white/15 pt-3">
        <Link href="/partner/login" className="inline-flex min-h-11 items-center text-sm text-slate-200 hover:text-white">{t("chooser.partner")}</Link>
      </footer>
    </main>
  );
}
