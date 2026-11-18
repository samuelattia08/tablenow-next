/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as authLimits from "../authLimits.js";
import type * as bookingRules from "../bookingRules.js";
import type * as chat from "../chat.js";
import type * as clients from "../clients.js";
import type * as community from "../community.js";
import type * as partners from "../partners.js";
import type * as payments from "../payments.js";
import type * as reservations from "../reservations.js";
import type * as sessions from "../sessions.js";
import type * as tables from "../tables.js";
import type * as venueEvents from "../venueEvents.js";
import type * as venueFields from "../venueFields.js";
import type * as venues from "../venues.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authLimits: typeof authLimits;
  bookingRules: typeof bookingRules;
  chat: typeof chat;
  clients: typeof clients;
  community: typeof community;
  partners: typeof partners;
  payments: typeof payments;
  reservations: typeof reservations;
  sessions: typeof sessions;
  tables: typeof tables;
  venueEvents: typeof venueEvents;
  venueFields: typeof venueFields;
  venues: typeof venues;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
