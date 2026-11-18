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
import type * as bookingRules from "../bookingRules.js";
import type * as chat from "../chat.js";
import type * as clients from "../clients.js";
import type * as community from "../community.js";
import type * as partners from "../partners.js";
import type * as payments from "../payments.js";
import type * as reservations from "../reservations.js";
import type * as tables from "../tables.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  bookingRules: typeof bookingRules;
  chat: typeof chat;
  clients: typeof clients;
  community: typeof community;
  partners: typeof partners;
  payments: typeof payments;
  reservations: typeof reservations;
  tables: typeof tables;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
