import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { validateBookingDate } from "./bookingRules";
import { requireAccount } from "./sessions";

export function closedDate(ctx: QueryCtx, partnerId: Id<"partners">, date: string) {
  return ctx.db.query("closedBookingDates")
    .withIndex("by_partner_date", (q) => q.eq("partnerId", partnerId).eq("date", date)).unique();
}

export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const partnerId = await requireAccount(ctx, token, "partners");
    return ctx.db.query("closedBookingDates")
      .withIndex("by_partner_date", (q) => q.eq("partnerId", partnerId).gte("date", new Date().toISOString().slice(0, 10))).take(100);
  },
});

export const setClosed = mutation({
  args: { token: v.string(), date: v.string(), closed: v.boolean() },
  handler: async (ctx, { token, date, closed }) => {
    const partnerId = await requireAccount(ctx, token, "partners");
    validateBookingDate(date);
    const current = await closedDate(ctx, partnerId, date);
    if (!current && closed) await ctx.db.insert("closedBookingDates", { partnerId, date });
    if (current && !closed) await ctx.db.delete(current._id);
  },
});
