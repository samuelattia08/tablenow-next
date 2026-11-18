import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const consume = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }): Promise<boolean> => {
    const now = Date.now();
    const current = await ctx.db.query("authLimits").withIndex("by_key", (q) => q.eq("key", key)).unique();
    if (current && current.expiresAt > now) {
      if (current.count >= 8) return false;
      await ctx.db.patch(current._id, { count: current.count + 1 });
      return true;
    }
    if (current) await ctx.db.delete(current._id);
    const expiresAt = now + 15 * 60 * 1000;
    const limitId = await ctx.db.insert("authLimits", { key, count: 1, expiresAt });
    await ctx.scheduler.runAt(expiresAt, internal.authLimits.expire, { limitId });
    return true;
  },
});

export const expire = internalMutation({
  args: { limitId: v.id("authLimits") },
  handler: async (ctx, { limitId }) => {
    const limit = await ctx.db.get(limitId);
    if (limit && limit.expiresAt <= Date.now()) await ctx.db.delete(limitId);
  },
});
