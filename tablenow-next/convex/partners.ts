import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const partner = await ctx.db
      .query("partners")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!partner) {
      throw new Error("Email ou mot de passe incorrect.");
    }

    const valid = bcrypt.compareSync(args.password, partner.passwordHash);
    if (!valid) {
      throw new Error("Email ou mot de passe incorrect.");
    }

    return {
      partnerId: partner._id,
      clubName: partner.clubName,
      email: partner.email,
    };
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const partners = await ctx.db.query("partners").collect();
    return partners.map((p) => ({
      _id: p._id,
      clubName: p.clubName,
      city: p.city,
    }));
  },
});

export const getById = query({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args) => {
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) return null;
    const galleryUrls = partner.galleryStorageIds
      ? await Promise.all(
          partner.galleryStorageIds.map((id) => ctx.storage.getUrl(id))
        )
      : [];
    return {
      _id: partner._id,
      email: partner.email,
      clubName: partner.clubName,
      city: partner.city,
      instagram: partner.instagram,
      tiktok: partner.tiktok,
      photoUrl: partner.photoUrl,
      galleryUrls: galleryUrls.filter((u): u is string => !!u),
    };
  },
});

export const updateProfile = mutation({
  args: {
    partnerId: v.id("partners"),
    city: v.optional(v.string()),
    instagram: v.optional(v.string()),
    tiktok: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { partnerId, ...fields } = args;
    await ctx.db.patch(partnerId, fields);
  },
});

export const generateGalleryUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addGalleryPhoto = mutation({
  args: {
    partnerId: v.id("partners"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new Error("Partenaire introuvable.");
    const current = partner.galleryStorageIds ?? [];
    await ctx.db.patch(args.partnerId, {
      galleryStorageIds: [...current, args.storageId],
    });
  },
});

function seedTablesForPartner(ctx: any, partnerId: any) {
  const COLS = 10;
  const ROWS = 5; // 10 x 5 = 50 tables
  let number = 1;
  const inserts = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const zone = row < 2 ? "vip" : "standard";
      const capacity = zone === "vip" ? 8 : 4;
      const priceEur = zone === "vip" ? 450 : 180;
      inserts.push(
        ctx.db.insert("tables", {
          partnerId,
          number,
          zone,
          capacity,
          priceEur,
          row,
          col,
        })
      );
      number++;
    }
  }
  return Promise.all(inserts);
}

// Seeds the two existing demo partner accounts (club-lenocturne / club-klub7)
// Safe to call multiple times: skips creation if the account already exists.
export const seedDemoPartners = mutation({
  args: {},
  handler: async (ctx) => {
    const demoAccounts = [
      { email: "club-lenocturne@tablenow.app", clubName: "Le Nocturne" },
      { email: "club-klub7@tablenow.app", clubName: "Klub 7" },
    ];

    for (const acc of demoAccounts) {
      const existing = await ctx.db
        .query("partners")
        .withIndex("by_email", (q) => q.eq("email", acc.email))
        .unique();
      if (!existing) {
        const passwordHash = bcrypt.hashSync("demo1234", 10);
        const partnerId = await ctx.db.insert("partners", {
          email: acc.email,
          passwordHash,
          clubName: acc.clubName,
        });
        await seedTablesForPartner(ctx, partnerId);
      }
    }
    return { seeded: true };
  },
});
