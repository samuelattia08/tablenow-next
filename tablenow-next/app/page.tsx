"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ChooserPage() {
  const { t } = useLanguage();

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight">
          TABLE <span className="gradient-text">NOW</span>
        </h1>
        <p className="mt-3 text-muted">{t("chooser.tagline")}</p>

        <div className="mt-10 flex flex-col gap-4 text-left">
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
