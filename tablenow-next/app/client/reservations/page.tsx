"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ClientReservationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [clientId, setClientId] = useState<Id<"clients"> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tablenow_client_id");
    if (!stored) {
      router.push("/client/login");
      return;
    }
    setClientId(stored as Id<"clients">);
  }, [router]);

  const reservations = useQuery(
    api.reservations.listByClient,
    clientId ? { clientId } : "skip"
  );

  function handleLogout() {
    localStorage.removeItem("tablenow_client_id");
    router.push("/");
  }

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/client/chat"
              className="text-sm text-muted hover:text-text"
            >
              💬 Chat
            </Link>
            <Link
              href="/client/community"
              className="text-sm text-muted hover:text-text"
            >
              Communauté
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-muted hover:text-text"
            >
              {t("reservations.logout")}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8">
          <h1 className="text-xl font-semibold">{t("reservations.title")}</h1>
          <Link href="/client/book" className="btn-primary px-4 py-2 text-sm">
            {t("reservations.findTable")}
          </Link>
        </div>

        {reservations === undefined && (
          <p className="mt-6 text-sm text-muted">{t("reservations.loading")}</p>
        )}

        {reservations && reservations.length === 0 && (
          <div className="card mt-6 p-6 text-center">
            <p className="text-sm text-muted">{t("reservations.empty")}</p>
          </div>
        )}

        {reservations && reservations.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {reservations.map((r) => (
              <div key={r._id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Table {r.tableId} · {r.zone.toUpperCase()}
                  </p>
                  <p className="text-sm text-muted">
                    {r.date} · {r.partySize} {t("reservations.people")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{r.priceEur} €</p>
                  <p className="text-xs text-muted capitalize">{r.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
