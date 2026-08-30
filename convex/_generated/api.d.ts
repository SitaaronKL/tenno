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
import type * as agent_limits from "../agent/limits.js";
import type * as agent_ruleBuilder from "../agent/ruleBuilder.js";
import type * as agent_tools from "../agent/tools.js";
import type * as auth from "../auth.js";
import type * as completions from "../completions.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as emails_Digest from "../emails/Digest.js";
import type * as emails_MagicLink from "../emails/MagicLink.js";
import type * as emails_RuleMatch from "../emails/RuleMatch.js";
import type * as gamedata_dropSources from "../gamedata/dropSources.js";
import type * as gamedata_import from "../gamedata/import.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as ingest_apply from "../ingest/apply.js";
import type * as ingest_bounties from "../ingest/bounties.js";
import type * as ingest_de from "../ingest/de.js";
import type * as ingest_names from "../ingest/names.js";
import type * as ingest_normalize from "../ingest/normalize.js";
import type * as ingest_prune from "../ingest/prune.js";
import type * as ingest_pull from "../ingest/pull.js";
import type * as ingest_schedules from "../ingest/schedules.js";
import type * as ingest_staticBounties from "../ingest/staticBounties.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_resources from "../lib/resources.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_validators from "../lib/validators.js";
import type * as mastery from "../mastery.js";
import type * as matcher from "../matcher.js";
import type * as notify from "../notify.js";
import type * as photon from "../photon.js";
import type * as photonHttp from "../photonHttp.js";
import type * as profileSync from "../profileSync.js";
import type * as profiles from "../profiles.js";
import type * as resendHttp from "../resendHttp.js";
import type * as resets from "../resets.js";
import type * as retention from "../retention.js";
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
  "agent/limits": typeof agent_limits;
  "agent/ruleBuilder": typeof agent_ruleBuilder;
  "agent/tools": typeof agent_tools;
  auth: typeof auth;
  completions: typeof completions;
  crons: typeof crons;
  email: typeof email;
  "emails/Digest": typeof emails_Digest;
  "emails/MagicLink": typeof emails_MagicLink;
  "emails/RuleMatch": typeof emails_RuleMatch;
  "gamedata/dropSources": typeof gamedata_dropSources;
  "gamedata/import": typeof gamedata_import;
  goals: typeof goals;
  http: typeof http;
  "ingest/apply": typeof ingest_apply;
  "ingest/bounties": typeof ingest_bounties;
  "ingest/de": typeof ingest_de;
  "ingest/names": typeof ingest_names;
  "ingest/normalize": typeof ingest_normalize;
  "ingest/prune": typeof ingest_prune;
  "ingest/pull": typeof ingest_pull;
  "ingest/schedules": typeof ingest_schedules;
  "ingest/staticBounties": typeof ingest_staticBounties;
  "lib/auth": typeof lib_auth;
  "lib/resources": typeof lib_resources;
  "lib/phone": typeof lib_phone;
  "lib/validators": typeof lib_validators;
  mastery: typeof mastery;
  matcher: typeof matcher;
  notify: typeof notify;
  photon: typeof photon;
  photonHttp: typeof photonHttp;
  profileSync: typeof profileSync;
  profiles: typeof profiles;
  resendHttp: typeof resendHttp;
  resets: typeof resets;
  retention: typeof retention;
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
