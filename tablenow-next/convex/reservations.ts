import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    clientId: v.id("clients"),
    partnerId: v.id("partners"),
    tableId: v.string(),
    zone: v.string(),
    date: v.string(),
    partySize: v.number(),
    priceEur: v.number(),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const prior = await ctx.db
      .query("reservations")
      .withIndex("by_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .first();

    if (prior) {
      if (
        prior.status === "confirmed" &&
        prior.clientId === args.clientId &&
        prior.partnerId === args.partnerId &&
        prior.tableId === args.tableId &&
        prior.date === args.date &&
        prior.partySize === args.partySize &&
        prior.zone === args.zone &&
        prior.priceEur === args.priceEur
      ) {
        return { reservationId: prior._id };
      }
      throw new Error("Ce paiement a déjà été utilisé.");
    }

    const sameDatePartner = await ctx.db
      .query("reservations")
      .withIndex("by_partner_date", (q) =>
        q.eq("partnerId", args.partnerId).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    const alreadyTaken = sameDatePartner.some((r) => r.tableId === args.tableId);
    if (alreadyTaken) {
      throw new Error("Cette table est déjà réservée pour cette date.");
    }

    const reservationId = await ctx.db.insert("reservations", {
      ...args,
      status: "confirmed",
      createdAt: Date.now(),
    });
    return { reservationId };
  },
});

export const listByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reservations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

export const listByPartnerAndDate = query({
  args: { partnerId: v.id("partners"), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reservations")
      .withIndex("by_partner_date", (q) =>
        q.eq("partnerId", args.partnerId).eq("date", args.date)
      )
      .collect();
  },
});

export const listReservedTableNumbers = query({
  args: { partnerId: v.id("partners"), date: v.string() },
  handler: async (ctx, args) => {
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_partner_date", (q) =>
        q.eq("partnerId", args.partnerId).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    return reservations.map((r) => r.tableId);
  },
});

export const assertAvailable = query({
  args: { partnerId: v.id("partners"), date: v.string(), tableId: v.string() },
  handler: async (ctx, args) => {
    const reservations = await ctx.db.query("reservations")
      .withIndex("by_partner_date", q => q.eq("partnerId", args.partnerId).eq("date", args.date))
      .collect();
    if (reservations.some(r => r.tableId === args.tableId && r.status !== "cancelled")) {
      throw new Error("Cette table est déjà réservée pour cette date.");
    }
    return true;
  },
});
