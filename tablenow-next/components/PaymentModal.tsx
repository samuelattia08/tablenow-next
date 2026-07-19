"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { useLanguage } from "@/app/LanguageProvider";

function PaymentForm({
  amountEur,
  onSuccess,
  onCancel,
}: {
  amountEur: number;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message ?? "Le paiement a échoué.");
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setError("Le paiement n'a pas pu être confirmé.");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* PaymentElement auto-detects what the browser/device supports:
          card fields always, plus an Apple Pay (or Google Pay) button
          when the device, browser, and Stripe account are eligible. */}
      <PaymentElement />

      {error && (
        <p className="text-sm text-red" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 py-2.5 text-sm rounded-full border border-border text-muted hover:text-text disabled:opacity-60"
        >
          {t("payment.cancel")}
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60"
        >
          {processing ? t("payment.processing") : `${t("payment.pay")} ${amountEur} €`}
        </button>
      </div>
    </form>
  );
}

export function PaymentModal({
  clientSecret,
  amountEur,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  amountEur: number;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="card w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold">{t("payment.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("payment.sub")}</p>
        <div className="mt-5">
          <Elements
            stripe={getStripe()}
            options={{ clientSecret, appearance: { theme: "night" } }}
          >
            <PaymentForm
              amountEur={amountEur}
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}
