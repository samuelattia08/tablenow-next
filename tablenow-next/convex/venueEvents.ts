import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAccount } from "./sessions";
import { heldAdmissions } from "./admission";
import { admissionValidator } from "./venueFields";
import { validateBookingDate } from "./bookingRules";

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
    admission: v.optional(admissionValidator),
  },
  handler: async (ctx, args) => {
    const partnerId = await requireAccount(ctx, args.token, "partners");
    const name = args.name.trim();
    if (!name || !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.startTime)) {
      throw new ConvexError("Indique le nom et l’heure de la soirée.");
    }
    validateBookingDate(args.date);
    const admission = args.admission;
    if (admission && (!Number.isSafeInteger(admission.capacity) || admission.capacity < 1 || admission.capacity > 5000 ||
      !Number.isSafeInteger(admission.priceCents) || admission.priceCents < 50 || admission.priceCents > 100000)) {
      throw new ConvexError("Indique un stock de 1 à 5 000 places et un tarif de 0,50 € à 1 000 €.");
    }
    const event = { partnerId, name: name.slice(0, 120), date: args.date, startTime: args.startTime,
      description: args.description.trim().slice(0, 1200), published: args.published, admission };
    if (!args.eventId) return ctx.db.insert("venueEvents", event);
    const current = await ctx.db.get(args.eventId);
    if (!current || current.partnerId !== partnerId) throw new ConvexError("Soirée introuvable.");
    const held = await heldAdmissions(ctx, args.eventId);
    if (held > 0 && (event.date !== current.date || event.startTime !== current.startTime || (admission && admission.capacity < held))) {
      throw new ConvexError("Des places sont réservées. Conserve la date et l’heure, ainsi qu’un stock suffisant.");
    }
    await ctx.db.replace(args.eventId, event);
    return args.eventId;
  },
});
