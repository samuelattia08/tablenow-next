import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAccount } from "./sessions";
import { closedDate } from "./availability";
import { venueFields } from "./venueFields";

function publicLink(input: string) {
  if (!input.trim()) return "";
  try {
    const url = new URL(input);
    if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 500) {
      return url.href;
    }
  } catch {
    // Fall through to the form error.
  }
  throw new ConvexError("Utilise une adresse HTTPS valide.");
}

function readProfile(ctx: QueryCtx, partnerId: Id<"partners">) {
  return ctx.db.query("venueProfiles").withIndex("by_partner", (q) => q.eq("partnerId", partnerId)).unique();
}

function eventsForTrip(ctx: QueryCtx, partnerId: Id<"partners">, from: string, to: string) {
  return ctx.db.query("venueEvents")
    .withIndex("by_partner_published_date", (q) => q.eq("partnerId", partnerId).eq("published", true).gte("date", from).lte("date", to))
    .take(8);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function publicVenue(ctx: QueryCtx, profile: Doc<"venueProfiles">) {
  const partner = await ctx.db.get(profile.partnerId);
  if (!partner) return null;
  const gallery = await Promise.all((partner.galleryStorageIds ?? []).slice(0, 12).map((id) => ctx.storage.getUrl(id)));
  return { ...profile, name: partner.clubName, gallery: gallery.filter((url): url is string => Boolean(url)) };
}

export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => readProfile(ctx, await requireAccount(ctx, token, "partners")),
});

export const save = mutation({
  args: { token: v.string(), profile: v.object(venueFields) },
  handler: async (ctx, { token, profile }) => {
    const partnerId = await requireAccount(ctx, token, "partners");
    const country = profile.country.trim();
    const city = profile.city.trim();
    if (profile.published && (!country || !city || !profile.description.trim())) {
      throw new ConvexError("Indique un pays, une ville et une description avant de publier.");
    }
    if (profile.minimumAge !== undefined && (!Number.isInteger(profile.minimumAge) || profile.minimumAge < 0 || profile.minimumAge > 100)) {
      throw new ConvexError("Âge minimum invalide.");
    }
    if (profile.entryPriceEur !== undefined && (!Number.isFinite(profile.entryPriceEur) || profile.entryPriceEur < 0)) {
      throw new ConvexError("Prix d’entrée invalide.");
    }
    const fields = {
      ...profile,
      country: country.slice(0, 80),
      city: city.slice(0, 80),
      music: Array.from(new Set(profile.music.map((genre) => genre.trim().slice(0, 40)).filter(Boolean))).slice(0, 12),
      description: profile.description.trim().slice(0, 2400),
      address: profile.address.trim().slice(0, 240),
      openingHours: profile.openingHours.trim().slice(0, 240),
      dressCode: profile.dressCode.trim().slice(0, 240),
      contact: profile.contact.trim().slice(0, 180),
      website: publicLink(profile.website),
      instagram: publicLink(profile.instagram),
      tiktok: publicLink(profile.tiktok),
      facebook: publicLink(profile.facebook),
      whatsapp: publicLink(profile.whatsapp),
      logo: publicLink(profile.logo),
      video: publicLink(profile.video),
    };
    const existing = await readProfile(ctx, partnerId);
    if (existing) await ctx.db.replace(existing._id, { partnerId, ...fields });
    else await ctx.db.insert("venueProfiles", { partnerId, ...fields });
  },
});

export const destinations = query({
  args: {},
  handler: async (ctx) => {
    const venues = await ctx.db.query("venueProfiles")
      .withIndex("by_published_country_city", (q) => q.eq("published", true)).take(500);
    return venues.map(({ country, city, music }) => ({ country, city, music }));
  },
});

export const search = query({
  args: {
    country: v.string(),
    city: v.string(),
    music: v.string(),
    from: v.string(),
    to: v.string(),
    guests: v.number(),
    eventsOnly: v.boolean(),
    availableOnly: v.boolean(),
  },
  handler: async (ctx, args) => {
    const from = args.from || today();
    const to = args.to || "9999-12-31";
    if (from > to || !Number.isSafeInteger(args.guests) || args.guests < 1 || args.guests > 100) return [];
    const profiles = await ctx.db.query("venueProfiles")
      .withIndex("by_published_country_city", (q) => {
        const published = q.eq("published", true);
        if (!args.country) return published;
        const country = published.eq("country", args.country);
        return args.city ? country.eq("city", args.city) : country;
      }).take(45);
    const matching = profiles.filter((venue) => (!args.city || venue.city === args.city) &&
      (!args.music || venue.music.includes(args.music)));
    const results = await Promise.all(matching.map(async (venue) => {
      const [partner, events, tables] = await Promise.all([
        ctx.db.get(venue.partnerId),
        eventsForTrip(ctx, venue.partnerId, from, to),
        ctx.db.query("tables").withIndex("by_partner", (q) => q.eq("partnerId", venue.partnerId)).take(150),
      ]);
      if (!partner || (args.eventsOnly && !events.length)) return null;
      const suitable = tables.filter((table) => table.capacity >= args.guests);
      const singleDay = args.from && args.from === args.to;
      const [closed, bookings] = singleDay ? await Promise.all([
        closedDate(ctx, venue.partnerId, from),
        ctx.db.query("reservations")
          .withIndex("by_partner_date", (q) => q.eq("partnerId", venue.partnerId).eq("date", from)).collect(),
      ]) : [null, []];
      const taken = new Set(bookings.filter((booking) => booking.status !== "cancelled").map((booking) => booking.tableId));
      const openings = closed ? [] : suitable.filter((table) => !taken.has(String(table.number)));
      if (args.availableOnly && (!singleDay || !openings.length)) return null;
      const pricedTables = singleDay && openings.length ? openings : suitable;
      const firstPhoto = partner.galleryStorageIds?.[0];
      return {
        partnerId: venue.partnerId,
        name: partner.clubName,
        city: venue.city,
        country: venue.country,
        music: venue.music,
        photo: firstPhoto ? await ctx.storage.getUrl(firstPhoto) : null,
        event: events[0] ?? null,
        availableOnSelectedDate: Boolean(singleDay && openings.length),
        tableFrom: pricedTables.length ? Math.min(...pricedTables.map((table) => table.priceEur)) : null,
      };
    }));
    return results.filter((venue) => venue !== null);
  },
});

export const detail = query({
  args: { venueId: v.string() },
  handler: async (ctx, { venueId }) => {
    const id = ctx.db.normalizeId("partners", venueId);
    if (!id) return null;
    const profile = await readProfile(ctx, id);
    if (!profile?.published) return null;
    const [venue, events, tables, reviews] = await Promise.all([
      publicVenue(ctx, profile),
      eventsForTrip(ctx, id, today(), "9999-12-31"),
      ctx.db.query("tables").withIndex("by_partner", (q) => q.eq("partnerId", id)).take(150),
      ctx.db.query("posts").withIndex("by_partner", (q) => q.eq("partnerId", id))
        .filter((q) => q.neq(q.field("rating"), undefined)).order("desc").take(10),
    ]);
    if (!venue) return null;
    return {
      ...venue,
      events,
      tableFrom: tables.length ? Math.min(...tables.map((table) => table.priceEur)) : null,
      reviews: reviews.map(({ _id, content, rating }) => ({ _id, content, rating })),
    };
  },
});
