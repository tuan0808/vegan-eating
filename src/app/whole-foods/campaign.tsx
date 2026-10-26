// src/app/whole-foods/campaign.tsx
//
// Copy for the Whole Foods QR giveaway, in one place. Anything in [brackets] is
// a placeholder still to be confirmed — <Tbd> renders it highlighted so it can't
// slip onto a printed QR card unnoticed. Dates come from Admin → Local signups
// (src/lib/local-markets.ts), not from here.

export const CAMPAIGN = "whole-foods";
export const PARTNER = "Whole Foods Market";
export const STORE = "[Store name / location, e.g. Whole Foods Market Boca Raton]";
export const PRIZE = "a free Whole Foods shopping spree — 20 minutes to spend $250";
export const PRIZE_VALUE = "Approximate retail value: $250";
export const WINNERS = "[Number of winners: 1]";
export const SPONSOR_ADDRESS = "[vegan eating mailing address]";
export const CONTACT_EMAIL = "[contact email for giveaway questions]";

/** Highlights a "[placeholder]" string; renders normal text unchanged. */
export function Tbd({ children }: { children: string }) {
    return children.startsWith("[") ? <mark className="wf-tbd">{children}</mark> : <>{children}</>;
}
