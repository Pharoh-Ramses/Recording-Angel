/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as members from "../members.js";
import type * as moderation from "../moderation.js";
import type * as posts from "../posts.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as stakes from "../stakes.js";
import type * as users from "../users.js";
import type * as wards from "../wards.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "lib/permissions": typeof lib_permissions;
  members: typeof members;
  moderation: typeof moderation;
  posts: typeof posts;
  roles: typeof roles;
  seed: typeof seed;
  stakes: typeof stakes;
  users: typeof users;
  wards: typeof wards;
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
