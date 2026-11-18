import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const roleValidator = v.union(v.literal("clients"), v.literal("partners"));
const sessionOwner = v.union(
  v.object({ role: v.literal("clients"), id: v.id("clients") }),
  v.object({ role: v.literal("partners"), id: v.id("partners") }),
);

type Owner = { role: "clients"; id: Id<"clients"> } | { role: "partners"; id: Id<"partners"> };

async function findSession(ctx: QueryCtx, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const tokenHash = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return ctx.db.query("accountSessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).unique();
}

export async function issueSession(ctx: MutationCtx, owner: Owner, tokenHash: string) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const sessionId = await ctx.db.insert("accountSessions", {
    owner,
    tokenHash,
    expiresAt,
  });
  await ctx.scheduler.runAt(expiresAt, internal.sessions.expire, { sessionId });
}

export const expire = internalMutation({
  args: { sessionId: v.id("accountSessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (session && session.expiresAt <= Date.now()) await ctx.db.delete(sessionId);
  },
});

async function activeOwner(ctx: QueryCtx, token: string) {
  const session = await findSession(ctx, token);
  if (!session || session.expiresAt <= Date.now()) return null;
  return (await ctx.db.get(session.owner.id)) ? session.owner : null;
}

export async function requireAccount<T extends Owner["role"]>(
  ctx: QueryCtx,
  token: string,
  role: T,
  id?: Id<T>,
) {
  const owner = await activeOwner(ctx, token);
  if (!owner || owner.role !== role || (id && owner.id !== id)) {
    throw new ConvexError("Ta session a expiré ou cet accès n’est pas autorisé.");
  }
  return owner.id as Id<T>;
}

export const current = query({
  args: { token: v.string() },
  returns: v.union(v.null(), sessionOwner),
  handler: (ctx, args) => activeOwner(ctx, args.token),
});

export const authorizeClient = internalQuery({
  args: { token: v.string(), clientId: v.optional(v.id("clients")) },
  handler: (ctx, args) => requireAccount(ctx, args.token, "clients", args.clientId),
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await findSession(ctx, args.token);
    if (session) await ctx.db.delete(session._id);
  },
});
