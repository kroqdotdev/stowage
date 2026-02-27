/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appSettings from "../appSettings.js";
import type * as assetTags from "../assetTags.js";
import type * as assets from "../assets.js";
import type * as assets_helpers from "../assets_helpers.js";
import type * as attachments from "../attachments.js";
import type * as attachmentsProcessing from "../attachmentsProcessing.js";
import type * as attachments_helpers from "../attachments_helpers.js";
import type * as auth from "../auth.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as authz from "../authz.js";
import type * as catalog_helpers from "../catalog_helpers.js";
import type * as categories from "../categories.js";
import type * as customFields from "../customFields.js";
import type * as custom_fields_helpers from "../custom_fields_helpers.js";
import type * as http from "../http.js";
import type * as locations from "../locations.js";
import type * as locations_helpers from "../locations_helpers.js";
import type * as tags from "../tags.js";
import type * as users from "../users.js";
import type * as users_helpers from "../users_helpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appSettings: typeof appSettings;
  assetTags: typeof assetTags;
  assets: typeof assets;
  assets_helpers: typeof assets_helpers;
  attachments: typeof attachments;
  attachmentsProcessing: typeof attachmentsProcessing;
  attachments_helpers: typeof attachments_helpers;
  auth: typeof auth;
  auth_helpers: typeof auth_helpers;
  authz: typeof authz;
  catalog_helpers: typeof catalog_helpers;
  categories: typeof categories;
  customFields: typeof customFields;
  custom_fields_helpers: typeof custom_fields_helpers;
  http: typeof http;
  locations: typeof locations;
  locations_helpers: typeof locations_helpers;
  tags: typeof tags;
  users: typeof users;
  users_helpers: typeof users_helpers;
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
