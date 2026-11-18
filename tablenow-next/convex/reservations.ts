import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    partnerId: v.id("partners"),
    tableId: v.string(),
    zone: v.string(),
    date: v.string(),
    partySize: v.number(),
    priceEur: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.stripePaymentIntentId) throw new Error("Paiement obligatoire.");\n    const prior = await ctx.db.query("reservations").withIndex("by_payment_intent", q => q.eq("stripePaymentIntentId", args.stripePaymentIntentId)).first();\n    if (prior) throw new Error("Ce paiement a déjà été utilisé.");\n    const sameDatePartner = await ctx.db
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
