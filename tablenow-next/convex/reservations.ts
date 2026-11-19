import { internalMutation, query } from "./_generated/server";
import { requireAccount } from "./sessions";
import { closedDate } from "./availability";
import { availableOffer } from "./admission";
import { v } from "convex/values";

export const holdForCapture = internalMutation({
  args: {
    clientId: v.id("clients"),
    partnerId: v.id("partners"),
    tableId: v.string(),
    eventId: v.optional(v.id("venueEvents")),
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
        (prior.status === "confirmed" || prior.status === "pending") &&
        prior.clientId === args.clientId &&
        prior.partnerId === args.partnerId &&
        prior.tableId === args.tableId &&
        prior.eventId === args.eventId &&
        prior.date === args.date &&
        prior.partySize === args.partySize &&
        prior.zone === args.zone &&
        prior.priceEur === args.priceEur
      ) {
        return { reservationId: prior._id, status: prior.status };
      }
      throw new Error("Ce paiement a déjà été utilisé.");
    }

    let eventName: string | undefined;
    if (args.eventId) {
      const offer = await availableOffer(ctx, args.eventId);
      if (!offer || offer.partnerId !== args.partnerId || offer.date !== args.date ||
          !Number.isSafeInteger(args.partySize) || args.partySize < 1 || args.partySize > offer.available ||
          Math.round(args.priceEur * 100) !== offer.priceCents * args.partySize) return null;
      eventName = offer.name;
    } else {
      if (await closedDate(ctx, args.partnerId, args.date)) return null;

      const sameDatePartner = await ctx.db
        .query("reservations")
        .withIndex("by_partner_date", (q) =>
          q.eq("partnerId", args.partnerId).eq("date", args.date)
        )
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect();

      const alreadyTaken = sameDatePartner.some((r) => r.tableId === args.tableId);
      if (alreadyTaken) return null;
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) return null;

    const reservationId = await ctx.db.insert("reservations", {
      ...args,
      eventName,
      status: "pending",
      createdAt: Date.now(),
    });
    return { reservationId, status: "pending" };
  },
});

export const settleCapture = internalMutation({
  args: {
    paymentIntentId: v.string(),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.query("reservations")
      .withIndex("by_payment_intent", (q) => q.eq("stripePaymentIntentId", args.paymentIntentId))
      .unique();
    if (!reservation) return null;
    if (reservation.status === "pending") {
      await ctx.db.patch(reservation._id, { status: args.status });
    } else if (reservation.status !== args.status) {
      throw new Error("L’état du paiement demande une vérification.");
    }
    return reservation._id;
  },
});

export const listByClient = query({
  args: { clientId: v.id("clients"), token: v.string() },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.token, "clients", args.clientId);
    return await ctx.db
      .query("reservations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

export const listByPartnerAndDate = query({
  args: { partnerId: v.id("partners"), date: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.token, "partners", args.partnerId);
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
    if (await closedDate(ctx, args.partnerId, args.date)) {
      const tables = await ctx.db.query("tables")
        .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId)).collect();
      return tables.map((table) => String(table.number));
    }
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_partner_date", (q) =>
        q.eq("partnerId", args.partnerId).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    return reservations.filter((r) => !r.eventId).map((r) => r.tableId);
  },
});

export const assertAvailable = query({
  args: { partnerId: v.id("partners"), date: v.string(), tableId: v.string() },
  handler: async (ctx, args) => {
    if (await closedDate(ctx, args.partnerId, args.date)) {
      throw new Error("Les réservations sont fermées pour cette date.");
    }
    const reservations = await ctx.db.query("reservations")
      .withIndex("by_partner_date", q => q.eq("partnerId", args.partnerId).eq("date", args.date))
      .collect();
    if (reservations.some(r => r.tableId === args.tableId && r.status !== "cancelled")) {
      throw new Error("Cette table est déjà réservée pour cette date.");
    }
    return true;
  },
});
