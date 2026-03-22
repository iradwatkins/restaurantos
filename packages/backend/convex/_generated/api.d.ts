/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounting_mutations from "../accounting/mutations.js";
import type * as accounting_queries from "../accounting/queries.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as catering_mutations from "../catering/mutations.js";
import type * as catering_queries from "../catering/queries.js";
import type * as customers_mutations from "../customers/mutations.js";
import type * as customers_queries from "../customers/queries.js";
import type * as dailySpecials_mutations from "../dailySpecials/mutations.js";
import type * as dailySpecials_queries from "../dailySpecials/queries.js";
import type * as delivery_mutations from "../delivery/mutations.js";
import type * as delivery_queries from "../delivery/queries.js";
import type * as discounts_mutations from "../discounts/mutations.js";
import type * as discounts_queries from "../discounts/queries.js";
import type * as events_mutations from "../events/mutations.js";
import type * as events_queries from "../events/queries.js";
import type * as inventory_mutations from "../inventory/mutations.js";
import type * as inventory_queries from "../inventory/queries.js";
import type * as kds_mutations from "../kds/mutations.js";
import type * as kds_queries from "../kds/queries.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_order_number from "../lib/order_number.js";
import type * as lib_report_utils from "../lib/report_utils.js";
import type * as lib_split_utils from "../lib/split_utils.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_tenant_auth from "../lib/tenant_auth.js";
import type * as lib_test_helpers from "../lib/test_helpers.js";
import type * as lib_validators from "../lib/validators.js";
import type * as loyalty_mutations from "../loyalty/mutations.js";
import type * as loyalty_queries from "../loyalty/queries.js";
import type * as marketing_mutations from "../marketing/mutations.js";
import type * as marketing_queries from "../marketing/queries.js";
import type * as marketing_triggers from "../marketing/triggers.js";
import type * as menu_mutations from "../menu/mutations.js";
import type * as menu_queries from "../menu/queries.js";
import type * as offline_mutations from "../offline/mutations.js";
import type * as offline_queries from "../offline/queries.js";
import type * as onboarding from "../onboarding.js";
import type * as orders_mutations from "../orders/mutations.js";
import type * as orders_queries from "../orders/queries.js";
import type * as orders_split from "../orders/split.js";
import type * as public_mutations from "../public/mutations.js";
import type * as public_queries from "../public/queries.js";
import type * as reports_queries from "../reports/queries.js";
import type * as reservations_mutations from "../reservations/mutations.js";
import type * as reservations_queries from "../reservations/queries.js";
import type * as scheduling_exports from "../scheduling/exports.js";
import type * as scheduling_mutations from "../scheduling/mutations.js";
import type * as scheduling_queries from "../scheduling/queries.js";
import type * as seed from "../seed.js";
import type * as seedTestUsers from "../seedTestUsers.js";
import type * as tables_mutations from "../tables/mutations.js";
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
  "accounting/mutations": typeof accounting_mutations;
  "accounting/queries": typeof accounting_queries;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "catering/mutations": typeof catering_mutations;
  "catering/queries": typeof catering_queries;
  "customers/mutations": typeof customers_mutations;
  "customers/queries": typeof customers_queries;
  "dailySpecials/mutations": typeof dailySpecials_mutations;
  "dailySpecials/queries": typeof dailySpecials_queries;
  "delivery/mutations": typeof delivery_mutations;
  "delivery/queries": typeof delivery_queries;
  "discounts/mutations": typeof discounts_mutations;
  "discounts/queries": typeof discounts_queries;
  "events/mutations": typeof events_mutations;
  "events/queries": typeof events_queries;
  "inventory/mutations": typeof inventory_mutations;
  "inventory/queries": typeof inventory_queries;
  "kds/mutations": typeof kds_mutations;
  "kds/queries": typeof kds_queries;
  "lib/auth": typeof lib_auth;
  "lib/order_number": typeof lib_order_number;
  "lib/report_utils": typeof lib_report_utils;
  "lib/split_utils": typeof lib_split_utils;
  "lib/storage": typeof lib_storage;
  "lib/tenant_auth": typeof lib_tenant_auth;
  "lib/test_helpers": typeof lib_test_helpers;
  "lib/validators": typeof lib_validators;
  "loyalty/mutations": typeof loyalty_mutations;
  "loyalty/queries": typeof loyalty_queries;
  "marketing/mutations": typeof marketing_mutations;
  "marketing/queries": typeof marketing_queries;
  "marketing/triggers": typeof marketing_triggers;
  "menu/mutations": typeof menu_mutations;
  "menu/queries": typeof menu_queries;
  "offline/mutations": typeof offline_mutations;
  "offline/queries": typeof offline_queries;
  onboarding: typeof onboarding;
  "orders/mutations": typeof orders_mutations;
  "orders/queries": typeof orders_queries;
  "orders/split": typeof orders_split;
  "public/mutations": typeof public_mutations;
  "public/queries": typeof public_queries;
  "reports/queries": typeof reports_queries;
  "reservations/mutations": typeof reservations_mutations;
  "reservations/queries": typeof reservations_queries;
  "scheduling/exports": typeof scheduling_exports;
  "scheduling/mutations": typeof scheduling_mutations;
  "scheduling/queries": typeof scheduling_queries;
  seed: typeof seed;
  seedTestUsers: typeof seedTestUsers;
  "tables/mutations": typeof tables_mutations;
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
