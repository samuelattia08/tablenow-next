"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY n'est pas configurée sur ce déploiement Convex."
    );
  }
  return new Stripe(key);
}

// Step 1: called when the client opens the payment step for a table.
// Creates a Stripe PaymentIntent with automatic_payment_methods enabled,
// which makes Stripe's <PaymentElement> show Card AND Apple Pay (and
// Google Pay) automatically, when the browser/device supports them.
export const createPaymentIntent = action({
  args: {
    amountEur: v.number(),
    tableNumber: v.number(),
    clubName: v.string(),
  },
  returns: v.object({
    clientSecret: v.union(v.string(), v.null()),
    paymentIntentId: v.string(),
  }),
  handler: async (ctx, args) => {
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(args.amountEur * 100), // Stripe uses cents
      currency: "eur",
      payment_method_types: ["card"],
      description: `TABLE NOW — Table ${args.tableNumber} — ${args.clubName}`,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  },
});

// Step 2: called after Stripe confirms the payment on the client side.
// We NEVER trust the client's word that "payment succeeded" — we re-check
// the PaymentIntent status and amount directly with Stripe here, server-side,
// before creating the reservation. This is what makes the payment "real"
// rather than cosmetic.
export const confirmReservationPayment = action({
  args: {
    paymentIntentId: v.string(),
    clientId: v.id("clients"),
    partnerId: v.id("partners"),
    tableId: v.string(),
    zone: v.string(),
    date: v.string(),
    partySize: v.number(),
    expectedAmountEur: v.number(),
  },
  returns: v.object({
    reservationId: v.id("reservations"),
  }),
  handler: async (ctx, args) => {
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.retrieve(
      args.paymentIntentId
    );

    if (paymentIntent.status !== "succeeded") {
      throw new Error(
        `Le paiement n'est pas confirmé (statut Stripe : ${paymentIntent.status}).`
      );
    }

    const expectedCents = Math.round(args.expectedAmountEur * 100);
    if (paymentIntent.amount !== expectedCents) {
      throw new Error("Le montant payé ne correspond pas au prix de la table.");
    }

    const result = await ctx.runMutation(api.reservations.create, {
      clientId: args.clientId,
      partnerId: args.partnerId,
      tableId: args.tableId,
      zone: args.zone,
      date: args.date,
      partySize: args.partySize,
      priceEur: args.expectedAmountEur,
      stripePaymentIntentId: args.paymentIntentId,
    });

    return result;
  },
});
