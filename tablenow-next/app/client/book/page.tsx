"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaymentModal } from "@/components/PaymentModal";
import { useLanguage } from "@/app/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [clientId, setClientId] = useState<Id<"clients"> | null>(null);
  const [partnerId, setPartnerId] = useState<Id<"partners"> | null>(null);
  const [date, setDate] = useState(todayIso());
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tablenow_client_id");
    if (!stored) {
      router.push("/client/login");
      return;
    }
    setClientId(stored as Id<"clients">);
  }, [router]);

  const clubs = useQuery(api.partners.listPublic);
  const tables = useQuery(
    api.tables.listByPartner,
    partnerId ? { partnerId } : "skip"
  );
  const reservedTableIds = useQuery(
    api.reservations.listReservedTableNumbers,
    partnerId ? { partnerId, date } : "skip"
  );
  const createPaymentIntent = useAction(api.payments.createPaymentIntent);
  const confirmReservationPayment = useAction(
    api.payments.confirmReservationPayment
  );
  const [paymentSecret, setPaymentSecret] = useState<string | null>(null);

  // Auto-select the first club once loaded
  useEffect(() => {
    if (!partnerId && clubs && clubs.length > 0) {
      setPartnerId(clubs[0]._id);
    }
  }, [clubs, partnerId]);

  const reservedSet = useMemo(
    () => new Set(reservedTableIds ?? []),
    [reservedTableIds]
  );

  const grid = useMemo(() => {
    if (!tables) return null;
    const rows = Math.max(...tables.map((t) => t.row), 0) + 1;
    const cols = Math.max(...tables.map((t) => t.col), 0) + 1;
    const map: (typeof tables[number] | null)[][] = Array.from(
      { length: rows },
      () => Array(cols).fill(null)
    );
    for (const t of tables) {
      map[t.row][t.col] = t;
    }
    return map;
  }, [tables]);

  const selectedTable = tables?.find((t) => t.number === selectedTableNumber);

  async function handleConfirm() {
    if (!clientId || !partnerId || !selectedTable) return;
    setConfirming(true);
    setError(null);
    try {
      const { clientSecret } = await createPaymentIntent({
        partnerId,\n        date,\n        partySize,\n        amountEur: selectedTable.priceEur,
        tableNumber: selectedTable.number,
        clubName: clubs?.find((c) => c._id === partnerId)?.clubName ?? "",
      });
      if (!clientSecret) throw new Error("Impossible d'initialiser le paiement.");
      setPaymentSecret(clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setConfirming(false);
    }
  }

  async function handlePaymentSuccess(confirmedPaymentIntentId: string) {
    if (!clientId || !partnerId || !selectedTable) return;
    try {
      await confirmReservationPayment({
        paymentIntentId: confirmedPaymentIntentId,
        clientId,
        partnerId,
        tableId: String(selectedTable.number),
        zone: selectedTable.zone,
        date,
        partySize,
        expectedAmountEur: selectedTable.priceEur,
      });
      setSuccess(
        `Paiement confirmé — table ${selectedTable.number} réservée pour le ${date}.`
      );
      setPaymentSecret(null);
      setSelectedTableNumber(null);
      setTimeout(() => router.push("/client/reservations"), 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Le paiement a réussi mais la réservation a échoué — contacte le support."
      );
      setPaymentSecret(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-xl sm:text-2xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/client/reservations"
              className="text-sm text-muted hover:text-text"
            >
              {t("book.myReservations")}
            </Link>
          </div>
        </div>

        <h1 className="mt-6 text-lg sm:text-xl font-semibold">
          {t("book.title")}
        </h1>

        {/* Club + date selectors */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <select
            value={partnerId ?? ""}
            onChange={(e) => {
              setPartnerId(e.target.value as Id<"partners">);
              setSelectedTableNumber(null);
            }}
            className="input-field px-3 py-2.5 text-sm flex-1"
          >
            {clubs === undefined && <option>{t("reservations.loading")}</option>}
            {clubs?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.clubName}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedTableNumber(null);
            }}
            className="input-field px-3 py-2.5 text-sm"
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded gradient-bg" /> {t("book.legendVip")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-surface-alt border border-border" />{" "}
            {t("book.legendStandard")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-surface-alt border border-border opacity-40" />{" "}
            {t("book.legendReserved")}
          </span>
        </div>

        {/* Floor plan grid */}
        <div className="mt-6 overflow-x-auto">
          {!grid && (
            <p className="text-sm text-muted py-8 text-center">
              {t("book.loadingPlan")}
            </p>
          )}
          {grid && (
            <div
              className="grid gap-1 sm:gap-2 w-full"
              style={{
                gridTemplateColumns: `repeat(${grid[0]?.length ?? 10}, minmax(0, 1fr))`,
              }}
            >
              {grid.flatMap((row, ri) =>
                row.map((t, ci) => {
                  if (!t) return <div key={`${ri}-${ci}`} />;
                  const isReserved = reservedSet.has(String(t.number));
                  const isSelected = selectedTableNumber === t.number;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      disabled={isReserved}
                      onClick={() => setSelectedTableNumber(t.number)}
                      aria-pressed={isSelected}
                      aria-label={`Table ${t.number}, zone ${t.zone}, ${t.capacity} personnes, ${t.priceEur} euros${isReserved ? ", déjà réservée" : ""}`}
                      className={[
                        "aspect-square rounded-md text-[9px] sm:text-xs font-semibold flex items-center justify-center transition-all",
                        isReserved
                          ? "bg-surface-alt border border-border opacity-40 cursor-not-allowed"
                          : t.zone === "vip"
                          ? "gradient-bg text-white hover:brightness-110"
                          : "bg-surface-alt border border-border hover:border-blue/50",
                        isSelected
                          ? "ring-2 ring-offset-2 ring-offset-bg ring-text scale-105"
                          : "",
                      ].join(" ")}
                    >
                      {t.number}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Selected table detail + confirm */}
        {selectedTable && (
          <div className="card mt-6 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  Table {selectedTable.number} —{" "}
                  {selectedTable.zone === "vip" ? "VIP" : "Standard"}
                </p>
                <p className="text-sm text-muted">
                  Jusqu&apos;à {selectedTable.capacity} {t("book.upTo")}
                </p>
              </div>
              <p className="text-lg font-bold">{selectedTable.priceEur} €</p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label htmlFor="partySize" className="text-sm font-medium">
                {t("book.people")}
              </label>
              <input
                id="partySize"
                type="number"
                min={1}
                max={selectedTable.capacity}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="input-field w-20 px-2 py-1.5 text-sm"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-3 text-sm text-blue" role="status">
                {success}
              </p>
            )}

            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-primary mt-4 w-full py-2.5 text-sm disabled:opacity-60"
            >
              {confirming
                ? t("book.preparing")
                : `${t("book.payAndBook")} — ${selectedTable.priceEur} €`}
            </button>
          </div>
        )}

        {paymentSecret && selectedTable && (
          <PaymentModal
            clientSecret={paymentSecret}
            amountEur={selectedTable.priceEur}
            onSuccess={handlePaymentSuccess}
            onCancel={() => {
              setPaymentSecret(null);
            }}
          />
        )}
      </div>
    </main>
  );
}
