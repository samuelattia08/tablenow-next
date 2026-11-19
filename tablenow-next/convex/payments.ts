"use node";

import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import { validateBookingSelection } from "./bookingRules";

const checkoutLifetime = 15 * 60 * 1000;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConvexError("Le paiement est temporairement indisponible.");
  return new Stripe(key);
}

export const createPaymentIntent = action({
  args: {
    token: v.string(),
    partnerId: v.id("partners"),
    date: v.string(),
    partySize: v.number(),
    tableNumber: v.number(),
  },
  returns: v.object({ clientSecret: v.union(v.string(), v.null()), paymentIntentId: v.string() }),
  handler: async (ctx, args) => {
    const clientId = await ctx.runQuery(internal.sessions.authorizeClient, { token: args.token });
    const table = await ctx.runQuery(api.tables.getBookableTable, {
      partnerId: args.partnerId,
      tableNumber: args.tableNumber,
    });
    const amount = validateBookingSelection(args.date, args.partySize, table);
    await ctx.runQuery(api.reservations.assertAvailable, {
      partnerId: args.partnerId,
      date: args.date,
      tableId: String(args.tableNumber),
    });

    const stripe = getStripe();
    const payment = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      capture_method: "manual",
      payment_method_types: ["card"],
      metadata: {
        integration: "tablenow_manual_capture",
        clientId,
        partnerId: args.partnerId,
        tableNumber: String(args.tableNumber),
        date: args.date,
        partySize: String(args.partySize),
        zone: table.zone,
      },
      description: `TABLE NOW — Table ${args.tableNumber}`,
    });

    await ctx.scheduler.runAfter(checkoutLifetime, internal.payments.recoverCheckout, {
      paymentIntentId: payment.id,
      attempt: 0,
    });
    return { clientSecret: payment.client_secret, paymentIntentId: payment.id };
  },
});

export const createAdmissionPayment = action({
  args: { token: v.string(), eventId: v.id("venueEvents"), quantity: v.number(), unitPriceCents: v.number() },
  returns: v.object({ clientSecret: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const clientId = await ctx.runQuery(internal.sessions.authorizeClient, { token: args.token });
    const offer = await ctx.runQuery(internal.admission.checkoutOffer, { eventId: args.eventId });
    if (!offer || !Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > Math.min(10, offer.available)) {
      throw new ConvexError("Ce nombre de places n’est plus disponible.");
    }
    if (offer.priceCents !== args.unitPriceCents) throw new ConvexError("Le tarif a changé. Vérifie le nouveau montant.");
    const payment = await getStripe().paymentIntents.create({
      amount: offer.priceCents * args.quantity,
      currency: "eur",
      capture_method: "manual",
      payment_method_types: ["card"],
      metadata: {
        integration: "tablenow_manual_capture",
        clientId,
        partnerId: offer.partnerId,
        eventId: args.eventId,
        date: offer.date,
        partySize: String(args.quantity),
        zone: "admission",
      },
      description: `TABLE NOW — ${offer.name}`,
    });
    await ctx.scheduler.runAfter(checkoutLifetime, internal.payments.recoverCheckout, {
      paymentIntentId: payment.id, attempt: 0,
    });
    return { clientSecret: payment.client_secret };
  },
});

function isTableNowPayment(payment: Stripe.PaymentIntent) {
  return payment.capture_method === "manual" &&
    payment.currency === "eur" &&
    payment.metadata.integration === "tablenow_manual_capture";
}

async function completeCheckout(
  ctx: ActionCtx,
  stripe: Stripe,
  payment: Stripe.PaymentIntent,
): Promise<Id<"reservations"> | null> {
  if (!isTableNowPayment(payment)) throw new ConvexError("Paiement inconnu.");
  if (payment.status === "succeeded" || payment.status === "canceled") {
    return ctx.runMutation(internal.reservations.settleCapture, {
      paymentIntentId: payment.id,
      status: payment.status === "succeeded" ? "confirmed" : "cancelled",
    });
  }
  if (payment.status !== "requires_capture") return null;

  const { metadata } = payment;
  const reservation = await ctx.runMutation(internal.reservations.holdForCapture, {
    clientId: metadata.clientId as Id<"clients">,
    partnerId: metadata.partnerId as Id<"partners">,
    tableId: metadata.eventId ? "" : metadata.tableNumber,
    eventId: metadata.eventId as Id<"venueEvents"> | undefined,
    zone: metadata.zone,
    date: metadata.date,
    partySize: Number(metadata.partySize),
    priceEur: payment.amount / 100,
    stripePaymentIntentId: payment.id,
  });
  if (!reservation) {
    await stripe.paymentIntents.cancel(payment.id, {}, { idempotencyKey: `conflict-${payment.id}` });
    return null;
  }

  const captured = await stripe.paymentIntents.capture(
    payment.id,
    { amount_to_capture: payment.amount },
    { idempotencyKey: `capture-${payment.id}` },
  );
  if (captured.status !== "succeeded" || captured.amount_received !== payment.amount) {
    throw new ConvexError("La confirmation du paiement est en cours.");
  }
  return ctx.runMutation(internal.reservations.settleCapture, {
    paymentIntentId: payment.id,
    status: "confirmed",
  });
}

export const confirmReservationPayment = action({
  args: { token: v.string(), paymentIntentId: v.string() },
  returns: v.object({ reservationId: v.id("reservations") }),
  handler: async (ctx, args): Promise<{ reservationId: Id<"reservations"> }> => {
    const clientId = await ctx.runQuery(internal.sessions.authorizeClient, { token: args.token });
    const stripe = getStripe();
    const payment = await stripe.paymentIntents.retrieve(args.paymentIntentId);
    if (payment.metadata.clientId !== clientId) throw new ConvexError("Paiement inconnu.");
    const reservationId = await completeCheckout(ctx, stripe, payment);
    if (!reservationId) {
      throw new ConvexError("La réservation n’a pas été confirmée. Consulte tes réservations avant de réessayer.");
    }
    return { reservationId };
  },
});

export const recoverCheckout = internalAction({
  args: { paymentIntentId: v.string(), attempt: v.number() },
  handler: async (ctx, args): Promise<void> => {
    try {
      const stripe = getStripe();
      const payment = await stripe.paymentIntents.retrieve(args.paymentIntentId);
      if (!isTableNowPayment(payment)) return;
      if (payment.status === "processing") throw new Error("Stripe traite encore le paiement.");
      if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(payment.status)) {
        await stripe.paymentIntents.cancel(payment.id, {}, { idempotencyKey: `expired-${payment.id}` });
        await ctx.runMutation(internal.reservations.settleCapture, {
          paymentIntentId: payment.id,
          status: "cancelled",
        });
        return;
      }
      await completeCheckout(ctx, stripe, payment);
    } catch (error) {
      if (args.attempt >= 10) throw error;
      await ctx.scheduler.runAfter(Math.min(60 * 60 * 1000, 60_000 * 2 ** args.attempt), internal.payments.recoverCheckout, {
        ...args,
        attempt: args.attempt + 1,
      });
    }
  },
});
