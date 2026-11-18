import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { venueFields } from "./venueFields";

export default defineSchema({
  authLimits: defineTable({
    key: v.string(),
    count: v.number(),
    expiresAt: v.number(),
  }).index("by_key", ["key"]),

  accountSessions: defineTable({
    owner: v.union(
      v.object({ role: v.literal("clients"), id: v.id("clients") }),
      v.object({ role: v.literal("partners"), id: v.id("partners") }),
    ),
    tokenHash: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["tokenHash"]),

  clients: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    lang: v.optional(v.string()),
  }).index("by_email", ["email"]),

  partners: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    clubName: v.string(),
    city: v.optional(v.string()),
    instagram: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    galleryStorageIds: v.optional(v.array(v.id("_storage"))),
  }).index("by_email", ["email"]),

  venueProfiles: defineTable({
    partnerId: v.id("partners"),
    ...venueFields,
  })
    .index("by_partner", ["partnerId"])
    .index("by_published_country_city", ["published", "country", "city"]),

  venueEvents: defineTable({
    partnerId: v.id("partners"),
    name: v.string(),
    date: v.string(),
    startTime: v.string(),
    description: v.string(),
    published: v.boolean(),
  })
    .index("by_partner_date", ["partnerId", "date"])
    .index("by_partner_published_date", ["partnerId", "published", "date"]),

  reservations: defineTable({
    clientId: v.id("clients"),
    partnerId: v.id("partners"),
    tableId: v.string(),
    zone: v.string(), // "vip" | "dj" | "wc"
    date: v.string(), // ISO date, e.g. "2026-07-18"
    partySize: v.number(),
    priceEur: v.number(),
    status: v.string(), // "pending" | "confirmed" | "cancelled"
    createdAt: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_partner_date", ["partnerId", "date"])
    .index("by_payment_intent", ["stripePaymentIntentId"]),

  tables: defineTable({
    partnerId: v.id("partners"),
    number: v.number(), // table number, 1-50
    zone: v.string(), // "vip" | "dj" | "wc"
    capacity: v.number(),
    priceEur: v.number(),
    // Position on the floor plan grid, 0-indexed
    row: v.number(),
    col: v.number(),
  })
    .index("by_partner", ["partnerId"])
    .index("by_partner_number", ["partnerId", "number"]),

  posts: defineTable({
    clientId: v.id("clients"),
    partnerId: v.optional(v.id("partners")), // undefined = general feed
    content: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    rating: v.optional(v.number()), // 1-5 stars, only when tied to a club
    createdAt: v.number(),
  })
    .index("by_partner", ["partnerId"])
    .index("by_createdAt", ["createdAt"]),

  postLikes: defineTable({
    postId: v.id("posts"),
    clientId: v.id("clients"),
  })
    .index("by_post", ["postId"])
    .index("by_post_client", ["postId", "clientId"]),

  postComments: defineTable({
    postId: v.id("posts"),
    clientId: v.id("clients"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_post", ["postId"]),
});
