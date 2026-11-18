"use node";

import { createHash, randomBytes } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const credentials = { email: v.string(), password: v.string() };

function newSession() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

async function limitAttempts(ctx: ActionCtx, scope: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new ConvexError("Vérifie l’adresse e-mail.");
  }
  const key = createHash("sha256").update(`${scope}:${normalized}`).digest("hex");
  const allowed = await ctx.runMutation(internal.authLimits.consume, { key });
  if (!allowed) throw new ConvexError("Trop de tentatives. Réessaie dans 15 minutes.");
}

export const clientLogin = action({
  args: credentials,
  handler: async (ctx, args): Promise<{ clientId: Id<"clients">; token: string }> => {
    await limitAttempts(ctx, "client-login", args.email);
    const { token, tokenHash } = newSession();
    const { clientId } = await ctx.runMutation(internal.clients.login, { ...args, tokenHash });
    return { clientId, token };
  },
});

export const clientSignup = action({
  args: {
    ...credentials,
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    lang: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ clientId: Id<"clients">; token: string }> => {
    await limitAttempts(ctx, "client-signup", args.email);
    const { token, tokenHash } = newSession();
    const { clientId } = await ctx.runMutation(internal.clients.signup, { ...args, tokenHash });
    return { clientId, token };
  },
});

export const partnerLogin = action({
  args: credentials,
  handler: async (ctx, args): Promise<{ partnerId: Id<"partners">; token: string }> => {
    await limitAttempts(ctx, "partner-login", args.email);
    const { token, tokenHash } = newSession();
    const { partnerId } = await ctx.runMutation(internal.partners.login, {
      ...args,
      tokenHash,
      allowDemo: process.env.TABLENOW_ENABLE_DEMO === "true",
    });
    return { partnerId, token };
  },
});
