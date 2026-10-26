// src/lib/giveaway-content.ts
//
// The wording of the Whole Foods giveaway pages (/whole-foods, /whole-foods/next,
// /whole-foods/rules), editable at Admin → Campaign (Whole Foods / Official Rules) so staff can change copy
// without a deploy. Stored as JSON in the Setting KV store (no migration); any
// field left out of the stored value falls back to DEFAULTS below.
//
// Conventions staff use in the editor (rendered by campaign.tsx / rulesHtml):
//   {start} {end} {draw}  giveaway dates from Admin → Local signups
//   {prize} {partner} {ig}  the matching field / our Instagram handle
//   {rules}   a link to the official rules (short text fields only)
//   *word*    italic accent (headlines)
//   [text]    highlighted yellow — a placeholder still to be confirmed
// The entry form, dates and step progress stay in code: they're logic, not copy.
import sanitizeHtml from "sanitize-html";
import { getSetting, setSetting } from "./settings";
import { formatDay, IG_HANDLE, type Giveaway } from "./local-markets";

const KEY = "giveaway.content";

export type Step = { title: string; text: string };
export type GiveawayContent = {
    partner: string;
    prize: string;
    headline: string;
    dek: string;
    steps: [Step, Step, Step];
    formHeading: string;
    formSubheading: string;
    footer: string;
    rulesHeadline: string;
    rulesLead: string;
    rulesHtml: string;
    updatedAt?: string;
    updatedBy?: string;
};

const DEFAULT_RULES_HTML = `<h2>1. Sponsor</h2>
<p>The giveaway (the “Promotion”) is sponsored by vegan eating (veganeating.com), [vegan eating mailing address] (“Sponsor”). [Confirm Whole Foods Market’s role — co-sponsor, prize provider, or venue only — and that they approve the use of their name.]</p>
<p>This Promotion is in no way sponsored, endorsed or administered by, or associated with, Instagram or Meta Platforms, Inc. By entering, you release Instagram and Meta from any and all liability related to this Promotion.</p>
<h2>2. Eligibility</h2>
<p>Open to legal residents of the United States who are 18 years of age or older at the time of entry [and who reside in Florida / Palm Beach County — decide whether non-local entrants can win]. Employees of Sponsor [and of Whole Foods Market], and their immediate family and household members, are not eligible.</p>
<h2>3. Entry period</h2>
<p>The Promotion begins {start} and ends at 11:59 p.m. Eastern Time on {end} (the “Entry Period”). Entries made after the Entry Period ends are not eligible.</p>
<h2>4. How to enter</h2>
<ol>
<li><p>Create a free vegan eating account at <a href="/whole-foods">veganeating.com/whole-foods</a> (for example by scanning the QR code at [Store name / location, e.g. Whole Foods Market Boca Raton]), giving your username, email address, Instagram handle and ZIP code. Existing members can enter on the same page by adding their Instagram handle and ZIP code.</p></li>
<li><p>Verify your email address using the link we send you.</p></li>
<li><p>Follow <a href="https://www.instagram.com/${IG_HANDLE}/">@${IG_HANDLE}</a> on Instagram, and keep following until the winner is confirmed.</p></li>
</ol>
<p>Limit one entry per person, per email address and per Instagram account. Temporary or disposable email addresses are not accepted. Entries made with multiple, fake or automated accounts (including scripts, bots or newly created Instagram accounts made only to enter) will be disqualified. Creating an account also subscribes you to the vegan eating newsletter; you can opt out at any time in your account settings without affecting your entry.</p>
<h2>5. Prize</h2>
<p>[Number of winners: 1] winner(s) will receive {prize}. Approximate retail value: $250. The prize is non-transferable and no cash substitute is offered, except that Sponsor may substitute a prize of equal or greater value. [How the prize is delivered or picked up.] Any taxes are the winner’s responsibility.</p>
<h2>6. Winner selection &amp; notification</h2>
<p>On or about {draw}, Sponsor will randomly select a potential winner from all eligible entries received during the Entry Period. Odds of winning depend on the number of eligible entries. Sponsor will then confirm that the potential winner has a verified vegan eating account and follows {ig} on Instagram. If not, another entry will be drawn.</p>
<p>The potential winner will be notified by email [and/or Instagram direct message] and must respond within [7] days, or an alternate winner may be drawn. To claim the prize, the winner must show a valid government-issued photo ID whose name matches the winner’s account and whose address matches the ZIP code entered [at prize pickup / before the prize is sent]. A winner who can’t verify their identity forfeits the prize and an alternate may be drawn. Sponsor will never ask for payment, bank details or passwords to claim a prize.</p>
<h2>7. Publicity</h2>
<p>Except where prohibited, accepting the prize means the winner agrees that Sponsor may use their username, first name and city for promotional purposes without further compensation [confirm whether you want this].</p>
<h2>8. Privacy</h2>
<p>Information you give us is used to run this Promotion and your vegan eating account, as described in our [privacy policy link]. Your ZIP code tells us whether you’re local to our Boca Raton home base. We do not sell your information.</p>
<h2>9. General conditions</h2>
<p>Sponsor may disqualify anyone who tampers with the entry process or breaks these rules, and may cancel or modify the Promotion if fraud, technical failure or anything else outside Sponsor’s control affects its fairness. By entering, you release Sponsor [and Whole Foods Market] from liability for any injury or loss related to the Promotion or prize. This Promotion is governed by the laws of the State of Florida. [If the total prize value is over $5,000, Florida requires the Promotion to be registered and bonded with the Department of Agriculture and Consumer Services at least 7 days before it starts.]</p>
<h2>10. Winner list &amp; questions</h2>
<p>For the winner’s name (available after {draw}) or any questions, email [contact email for giveaway questions].</p>`;

export const DEFAULTS: GiveawayContent = {
    partner: "Whole Foods Market",
    prize: "a free Whole Foods shopping spree — 20 minutes to spend $250",
    headline: "Join us. *Win.*",
    dek: "Create a free vegan eating account and follow us on Instagram for a chance to win {prize}.",
    steps: [
        { title: "Create your free account", text: "Takes under a minute." },
        { title: "Verify your email", text: "Tap the link we send you." },
        { title: "Follow {ig}", text: "We check this before announcing the winner." },
    ],
    formHeading: "Create your account",
    formSubheading: "Free, no spam. Includes our newsletter — one tested recipe each Sunday. Opt out anytime.",
    footer: "No purchase necessary. 18+. See the {rules}. This promotion is not sponsored, endorsed or administered by, or associated with, Instagram.",
    rulesHeadline: "Official *rules.*",
    rulesLead: "No purchase necessary to enter or win. A purchase will not increase your chances of winning. Void where prohibited.",
    rulesHtml: DEFAULT_RULES_HTML,
};

const TEXT_FIELDS = ["partner", "prize", "headline", "dek", "formHeading", "formSubheading", "footer", "rulesHeadline", "rulesLead"] as const;
export const MAX_TEXT = 600;
export const MAX_RULES = 40_000;

export async function getGiveawayContent(): Promise<GiveawayContent> {
    const raw = await getSetting(KEY).catch(() => null);
    if (!raw) return DEFAULTS;
    try {
        const v = JSON.parse(raw) as Partial<GiveawayContent>;
        const out: GiveawayContent = { ...DEFAULTS };
        for (const k of TEXT_FIELDS) if (typeof v[k] === "string") out[k] = v[k];
        if (typeof v.rulesHtml === "string") out.rulesHtml = v.rulesHtml;
        if (Array.isArray(v.steps)) {
            out.steps = DEFAULTS.steps.map((d, i) => ({
                title: typeof v.steps?.[i]?.title === "string" ? v.steps[i].title : d.title,
                text: typeof v.steps?.[i]?.text === "string" ? v.steps[i].text : d.text,
            })) as GiveawayContent["steps"];
        }
        out.updatedAt = v.updatedAt;
        out.updatedBy = v.updatedBy;
        return out;
    } catch {
        return DEFAULTS;
    }
}

export async function saveGiveawayContent(c: GiveawayContent): Promise<void> {
    await setSetting(KEY, JSON.stringify(c));
}

/** Only the formatting the rules editor can produce; everything else is stripped. */
export function sanitizeRulesHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: ["p", "br", "h2", "h3", "strong", "b", "em", "i", "u", "s", "ol", "ul", "li", "a", "blockquote"],
        allowedAttributes: { a: ["href", "target", "rel"] },
        allowedSchemes: ["http", "https", "mailto"],
        allowedSchemesAppliedToAttributes: ["href"],
        allowProtocolRelative: false,
    });
}

/** Token values; dates include the year ("December 10, 2026"). */
export function giveawayVars(c: GiveawayContent, g: Giveaway): Record<string, string> {
    const full = (ymd: string) => `${formatDay(ymd)}, ${ymd.slice(0, 4)}`;
    return { start: full(g.start), end: full(g.end), draw: full(g.drawDate), prize: c.prize, partner: c.partner, ig: `@${IG_HANDLE}` };
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Stored (already sanitized) rules HTML → page HTML: fills {tokens} and wraps
 * [placeholders] in a highlight. Only text between tags is touched.
 */
export function renderRulesHtml(html: string, vars: Record<string, string>): string {
    return html
        .split(/(<[^>]*>)/)
        .map((part, i) =>
            i % 2 === 1
                ? part
                : part
                      .replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? escapeHtml(vars[k]) : m))
                      .replace(/\[([^\]]+)\]/g, '<mark class="wf-tbd">[$1]</mark>'),
        )
        .join("");
}
