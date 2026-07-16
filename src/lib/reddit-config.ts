// src/lib/reddit-config.ts
//
// Shared Reddit tracking config, safe to import from both client and server.
// Only reads the *public* pixel id here (NEXT_PUBLIC_*); the secret Conversions
// API token lives in reddit-capi.ts and never crosses to the client.
//
// The same id (format "a2_xxxxxxxxxx") is used to init the browser pixel *and*
// as the {account_id} path segment of the Conversions API — Reddit treats the
// pixel id as the ad-account id for CAPI. reddit-capi.ts lets you override the
// account id separately if your setup differs.

/** Public Reddit Pixel / advertiser id. Undefined ⇒ all Reddit tracking is dormant. */
export const REDDIT_PIXEL_ID = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID || "";

/** Whether the browser pixel should load at all. */
export const redditEnabled = () => REDDIT_PIXEL_ID.length > 0;

// Reddit standard event names we fire. Kept as a const so callers can't typo
// a tracking type the pixel/CAPI would silently drop.
export type RedditEventName =
    | "PageVisit"
    | "ViewContent"
    | "Search"
    | "AddToCart"
    | "AddToWishlist"
    | "Purchase"
    | "Lead"
    | "SignUp"
    | "Custom";
