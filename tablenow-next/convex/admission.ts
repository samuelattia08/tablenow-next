import { v } from "convex/values";
import { internalQuery, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export async function heldAdmissions(ctx: QueryCtx, eventId: Id<"venueEvents">) {
  const rows = await ctx.db.query("reservations").withIndex("by_event", (q) => q.eq("eventId", eventId)).collect();
  return rows.reduce((total, row) => row.status === "cancelled" ? total : total + row.partySize, 0);
}

export async function availableOffer(ctx: QueryCtx, eventId: Id<"venueEvents">) {
  const event = await ctx.db.get(eventId);
  if (!event?.published || !event.admission || event.date < new Date().toISOString().slice(0, 10)) return null;
  const venue = await ctx.db.query("venueProfiles").withIndex("by_partner", (q) => q.eq("partnerId", event.partnerId)).unique();
  if (!venue?.published) return null;
  return {
    eventId, name: event.name, date: event.date, startTime: event.startTime, partnerId: event.partnerId,
    priceCents: event.admission.priceCents,
    available: Math.max(0, event.admission.capacity - await heldAdmissions(ctx, eventId)),
  };
}

export const offer = query({
  args: { event: v.string() },
  handler: async (ctx, { event }) => {
    const eventId = ctx.db.normalizeId("venueEvents", event);
    return eventId ? availableOffer(ctx, eventId) : null;
  },
});

export const checkoutOffer = internalQuery({
  args: { eventId: v.id("venueEvents") },
  handler: (ctx, { eventId }) => availableOffer(ctx, eventId),
});
