import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByPartner = query({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
      .collect();
  },
});

export const updateTable = mutation({
  args: {
    tableId: v.id("tables"),
    zone: v.string(),
    capacity: v.number(),
    priceEur: v.number(),
  },
  handler: async (ctx, args) => {
    const { tableId, ...fields } = args;
    await ctx.db.patch(tableId, fields);
  },
});

// Seeds 50 bookable tables for a partner, laid out on a 10x5 grid.
// Front two rows (closer to the stage) are priced as "vip", the rest "standard".
// Safe to call multiple times: skips if tables already exist for this partner.
export const seedTables = mutation({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
      .first();
    if (existing) {
      return { seeded: false, reason: "Des tables existent déjà pour ce partenaire." };
    }

    const COLS = 10;
    const ROWS = 5; // 10 x 5 = 50 tables
    let number = 1;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const zone = row < 2 ? "vip" : "standard";
        const capacity = zone === "vip" ? 8 : 4;
        const priceEur = zone === "vip" ? 450 : 180;

        await ctx.db.insert("tables", {
          partnerId: args.partnerId,
          number,
          zone,
          capacity,
          priceEur,
          row,
          col,
        });
        number++;
      }
    }

    return { seeded: true, count: number - 1 };
  },
});

export const getBookableTable = query({
  args: { partnerId: v.id("partners"), tableNumber: v.number() },
  handler: async (ctx, args) => {
    const table = await ctx.db.query("tables")
      .withIndex("by_partner_number", q => q.eq("partnerId", args.partnerId).eq("number", args.tableNumber))
      .unique();
    if (!table) throw new Error("Table introuvable.");
    return { _id: table._id, number: table.number, priceEur: table.priceEur, capacity: table.capacity, zone: table.zone };
  },
});
