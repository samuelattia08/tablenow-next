import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { issueSession, requireAccount } from "./sessions";
import bcrypt from "bcryptjs";

export const signup = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
    tokenHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    lang: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      throw new Error("Un compte existe déjà avec cet email.");
    }

    if (args.password.length < 8 || bcrypt.truncates(args.password)) {
      throw new Error("Choisis un mot de passe d’au moins 8 caractères et d’au plus 72 octets.");
    }
    const passwordHash = bcrypt.hashSync(args.password, 10);

    const clientId = await ctx.db.insert("clients", {
      email,
      passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      lang: args.lang ?? "fr",
    });

    await issueSession(ctx, { role: "clients", id: clientId }, args.tokenHash);
    return { clientId };
  },
});

export const login = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!client) {
      throw new Error("Email ou mot de passe incorrect.");
    }

    const valid = bcrypt.compareSync(args.password, client.passwordHash);
    if (!valid) {
      throw new Error("Email ou mot de passe incorrect.");
    }

    await issueSession(ctx, { role: "clients", id: client._id }, args.tokenHash);
    return {
      clientId: client._id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
    };
  },
});

export const getById = query({
  args: { clientId: v.id("clients"), token: v.string() },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.token, "clients", args.clientId);
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;
    return {
      _id: client._id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      lang: client.lang,
    };
  },
});
