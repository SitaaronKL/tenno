/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent_chat from "../agent/chat.js";
import type * as agent_index from "../agent/index.js";
import type * as agent_ruleBuilder from "../agent/ruleBuilder.js";
import type * as agent_tools from "../agent/tools.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as emails_Digest from "../emails/Digest.js";
import type * as emails_MagicLink from "../emails/MagicLink.js";
import type * as emails_RuleMatch from "../emails/RuleMatch.js";
import type * as http from "../http.js";
import type * as ingest_apply from "../ingest/apply.js";
import type * as ingest_bounties from "../ingest/bounties.js";
import type * as ingest_de from "../ingest/de.js";
import type * as ingest_normalize from "../ingest/normalize.js";
import type * as ingest_pull from "../ingest/pull.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_validators from "../lib/validators.js";
import type * as matcher from "../matcher.js";
import type * as notify from "../notify.js";
import type * as photon from "../photon.js";
import type * as photonHttp from "../photonHttp.js";
import type * as profiles from "../profiles.js";
import type * as rules from "../rules.js";
import type * as wiki from "../wiki.js";
import type * as worldstate from "../worldstate.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agent/chat": typeof agent_chat;
  "agent/index": typeof agent_index;
  "agent/ruleBuilder": typeof agent_ruleBuilder;
  "agent/tools": typeof agent_tools;
  auth: typeof auth;
  crons: typeof crons;
  email: typeof email;
  "emails/Digest": typeof emails_Digest;
  "emails/MagicLink": typeof emails_MagicLink;
  "emails/RuleMatch": typeof emails_RuleMatch;
  http: typeof http;
  "ingest/apply": typeof ingest_apply;
  "ingest/bounties": typeof ingest_bounties;
  "ingest/de": typeof ingest_de;
  "ingest/normalize": typeof ingest_normalize;
  "ingest/pull": typeof ingest_pull;
  "lib/auth": typeof lib_auth;
  "lib/phone": typeof lib_phone;
  "lib/validators": typeof lib_validators;
  matcher: typeof matcher;
  notify: typeof notify;
  photon: typeof photon;
  photonHttp: typeof photonHttp;
  profiles: typeof profiles;
  rules: typeof rules;
  wiki: typeof wiki;
  worldstate: typeof worldstate;
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

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
