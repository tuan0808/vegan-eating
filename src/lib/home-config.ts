// src/lib/home-config.ts
// Which element leads the home page. The IG/FB-powered carousel breaks whenever
// the Meta API keys rotate/expire, so this is a quick kill-switch back to the
// original big recipe banner (the <Hero>). Flip it from Admin → Site settings →
// Home page. Default is "banner" so an unseeded DB (e.g. right after deploy)
// shows the always-working Hero rather than a broken carousel.
import { cache } from "react";
import { getSetting } from "@/lib/settings";

export type HomeLead = "carousel" | "banner";

export const DEFAULT_HOME_LEAD: HomeLead = "banner";

export const getHomeLead = cache(async (): Promise<HomeLead> => {
    const value = await getSetting("home.lead");
    return value === "carousel" || value === "banner" ? value : DEFAULT_HOME_LEAD;
});
