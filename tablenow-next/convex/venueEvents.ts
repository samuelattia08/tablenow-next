import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAccount } from "./sessions";
import { validateBookingSelection } from "./bookingRules";

export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const partnerId = await requireAccount(ctx, token, "partners");
    return ctx.db.query("venueEvents").withIndex("by_partner_date", (q) => q.eq("partnerId", partnerId)).order("desc").take(100);
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    eventId: v.optional(v.id("venueEvents")),
    name: v.string(),
    date: v.string(),
    startTime: v.string(),
    description: v.string(),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    const partnerId = await requireAccount(ctx, args.token, "partners");
    const name = args.name.trim();
    if (!name || !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.startTime)) {
      throw new ConvexError("Indique le nom et l’heure de la soirée.");
    }
    validateBookingSelection(args.date, 1, { capacity: 1, priceEur: 1 });
    const event = { partnerId, name: name.slice(0, 120), date: args.date, startTime: args.startTime,
      description: args.description.trim().slice(0, 1200), published: args.published };
    if (!args.eventId) return ctx.db.insert("venueEvents", event);
    const current = await ctx.db.get(args.eventId);
    if (!current || current.partnerId !== partnerId) throw new ConvexError("Soirée introuvable.");
    await ctx.db.replace(args.eventId, event);
    return args.eventId;
  },
});
