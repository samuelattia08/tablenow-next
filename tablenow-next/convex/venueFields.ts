import { v } from "convex/values";

export const venueFields = {
  country: v.string(),
  city: v.string(),
  music: v.array(v.string()),
  description: v.string(),
  address: v.string(),
  openingHours: v.string(),
  dressCode: v.string(),
  minimumAge: v.optional(v.number()),
  contact: v.string(),
  website: v.string(),
  instagram: v.string(),
  tiktok: v.string(),
  facebook: v.string(),
  whatsapp: v.string(),
  logo: v.string(),
  video: v.string(),
  entryPriceEur: v.optional(v.number()),
  published: v.boolean(),
};
