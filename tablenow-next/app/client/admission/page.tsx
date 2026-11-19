"use client";

import { Suspense, useState } from "react";
import { useAction, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/LanguageProvider";
import { api } from "@/convex/_generated/api";
import { admissionHref, clientAuthHref } from "@/lib/client-navigation";
import { useStoredAccount } from "@/lib/use-stored-account";

const PaymentModal = dynamic(() => import("@/components/PaymentModal").then((module) => module.PaymentModal));

function AdmissionCheckout() {
  const event = useSearchParams().get("event");
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { token } = useStoredAccount("clients", clientAuthHref("login", admissionHref(event)));
  const offer = useQuery(api.admission.offer, token && event ? { event } : "skip");
  const create = useAction(api.payments.createAdmissionPayment);
  const confirm = useAction(api.payments.confirmReservationPayment);
  const [quantity, setQuantity] = useState(1);
  const [checkout, setCheckout] = useState<{ secret: string; amount: number }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [verifyHistory, setVerifyHistory] = useState(false);
  const currency = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" });

  async function startCheckout() {
    if (!token || !offer || busy || checkout || verifyHistory) return;
    setBusy(true);
    setError(undefined);
    try {
      const { clientSecret } = await create({ token, eventId: offer.eventId, quantity, unitPriceCents: offer.priceCents });
      if (!clientSecret) throw new Error("Checkout unavailable");
      setCheckout({ secret: clientSecret, amount: offer.priceCents * quantity / 100 });
    } catch {
      setError(t("admission.retry"));
    } finally {
      setBusy(false);
    }
  }

  async function complete(paymentIntentId: string) {
    if (!token) return;
    try {
      await confirm({ token, paymentIntentId });
      router.replace("/client/reservations");
    } catch {
      setCheckout(undefined);
      setVerifyHistory(true);
      setError(t("admission.check"));
    }
  }

  const max = offer ? Math.min(10, offer.available) : 0;
  return <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
    <Link className="back-link" href={offer ? `/venue/${offer.partnerId}` : "/explore"}>{t("explore.back")}</Link>
    <h1 className="mt-5 font-display text-3xl font-bold">{t("admission.title")}</h1>
    {event && offer === undefined && <p className="mt-4 text-muted" role="status">{t("reservations.loading")}</p>}
    {(!event || offer === null) && <p className="mt-4 text-muted">{t("admission.unavailable")}</p>}
    {offer && <section className="card mt-5 p-5">
      <h2 className="text-xl font-semibold">{offer.name}</h2>
      <p className="mt-1 text-muted">{new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(offer.date))} · {offer.startTime}</p>
      {max === 0 ? <p className="mt-4">{t("admission.soldOut")}</p> : <form className="mt-4 grid gap-4" onSubmit={(e) => { e.preventDefault(); void startCheckout(); }}>
        <label className="grid gap-1.5">{t("admission.quantity")}
          <input className="input-field min-h-11 w-full px-3 text-base" type="number" required min="1" max={max}
            value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} />
        </label>
        <button className="btn-primary min-h-11 px-5" disabled={busy || !!checkout || verifyHistory || !Number.isInteger(quantity) || quantity < 1 || quantity > max}>
          {t("admission.pay")} · {currency.format(quantity * offer.priceCents / 100)}
        </button>
      </form>}
    </section>}
    {error && <p className="mt-4 text-red" role="alert">{error}</p>}
    {verifyHistory && <Link className="back-link" href="/client/reservations">{t("reservations.title")}</Link>}
    {checkout && <PaymentModal clientSecret={checkout.secret} amountEur={checkout.amount} onSuccess={complete} onCancel={() => setCheckout(undefined)} />}
  </main>;
}

export default function Page() {
  return <Suspense><AdmissionCheckout /></Suspense>;
}
