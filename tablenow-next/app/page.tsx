"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ChooserPage() {
  const { t } = useLanguage();

  return (
    <main className="flex-1 flex items-center justify-center nightlife-hero min-h-svh px-5 pb-14 pt-24 sm:px-6 relative">
      <Link href="/" className="absolute top-5 start-5 font-display text-xl font-bold">TABLE <span className="gradient-text">NOW</span></Link>
      <div className="absolute top-5 end-5">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight">
          {t("hero.title")}
        </h1>
        <p className="mt-3 text-slate-200">{t("hero.subtitle")}</p>
        <Link href="/explore" className="btn-primary mt-6 inline-flex min-h-12 items-center px-7">{t("hero.explore")}</Link>

        <div className="mt-10 flex flex-col gap-4 text-start">
          <Link
            href="/client/login"
            className="card p-6 hover:border-blue/50 transition-colors focus-visible:outline-2 focus-visible:outline-blue"
          >
            <span className="text-lg font-semibold">{t("chooser.client")}</span>
            <p className="mt-1 text-sm text-muted">{t("chooser.clientSub")}</p>
          </Link>

          <Link
            href="/partner/login"
            className="card p-6 hover:border-red/50 transition-colors focus-visible:outline-2 focus-visible:outline-red"
          >
            <span className="text-lg font-semibold">{t("chooser.partner")}</span>
            <p className="mt-1 text-sm text-muted">{t("chooser.partnerSub")}</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
