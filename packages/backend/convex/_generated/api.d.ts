/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as kds_mutations from "../kds/mutations.js";
import type * as kds_queries from "../kds/queries.js";
import type * as lib_auth from "../lib/auth.js";
import type * as menu_mutations from "../menu/mutations.js";
import type * as menu_queries from "../menu/queries.js";
import type * as onboarding from "../onboarding.js";
import type * as orders_mutations from "../orders/mutations.js";
import type * as orders_queries from "../orders/queries.js";
import type * as public_mutations from "../public/mutations.js";
import type * as public_queries from "../public/queries.js";
import type * as reports_queries from "../reports/queries.js";
import type * as seed from "../seed.js";
import type * as tenants_mutations from "../tenants/mutations.js";
import type * as tenants_queries from "../tenants/queries.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as webhooks_mutations from "../webhooks/mutations.js";
import type * as webhooks_queries from "../webhooks/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "kds/mutations": typeof kds_mutations;
  "kds/queries": typeof kds_queries;
  "lib/auth": typeof lib_auth;
  "menu/mutations": typeof menu_mutations;
  "menu/queries": typeof menu_queries;
  onboarding: typeof onboarding;
  "orders/mutations": typeof orders_mutations;
  "orders/queries": typeof orders_queries;
  "public/mutations": typeof public_mutations;
  "public/queries": typeof public_queries;
  "reports/queries": typeof reports_queries;
  seed: typeof seed;
  "tenants/mutations": typeof tenants_mutations;
  "tenants/queries": typeof tenants_queries;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "webhooks/mutations": typeof webhooks_mutations;
  "webhooks/queries": typeof webhooks_queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
