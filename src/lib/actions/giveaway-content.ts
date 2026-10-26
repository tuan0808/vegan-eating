"use server";
// src/lib/actions/giveaway-content.ts — Admin → Campaign: save or reset one page's
// copy (the giveaway page or the official rules); the other page's is kept.
import { revalidatePath } from "next/cache";
import { userWith } from "@/lib/permissions";
import {
    DEFAULTS, getGiveawayContent, MAX_RULES, MAX_TEXT, saveGiveawayContent, sanitizeRulesHtml,
    type GiveawayContent, type Step,
} from "@/lib/giveaway-content";

export type SaveState = { ok: boolean; message: string | null; key?: number };

const PAGES = ["/whole-foods", "/whole-foods/next", "/whole-foods/rules", "/admin/campaign/whole-foods", "/admin/campaign/whole-foods/rules"];

type PageFields = Pick<GiveawayContent, "partner" | "prize" | "headline" | "dek" | "steps" | "formHeading" | "formSubheading" | "footer">;
type RulesFields = Pick<GiveawayContent, "rulesHeadline" | "rulesLead" | "rulesHtml">;

const fail = (message: string): SaveState => ({ ok: false, message, key: Date.now() });

export async function saveGiveawayContentAction(_prev: SaveState, fd: FormData): Promise<SaveState> {
    const u = await userWith("giveaway");
    if (!u) return fail("You don't have permission to change this.");
    const section = fd.get("section") === "rules" ? "rules" : "page";
    const current = await getGiveawayContent();

    let patch: PageFields | RulesFields;
    if (fd.get("intent") === "reset") {
        patch = section === "rules"
            ? { rulesHeadline: DEFAULTS.rulesHeadline, rulesLead: DEFAULTS.rulesLead, rulesHtml: DEFAULTS.rulesHtml }
            : {
                  partner: DEFAULTS.partner, prize: DEFAULTS.prize, headline: DEFAULTS.headline, dek: DEFAULTS.dek, steps: DEFAULTS.steps,
                  formHeading: DEFAULTS.formHeading, formSubheading: DEFAULTS.formSubheading, footer: DEFAULTS.footer,
              };
    } else {
        const text = (name: string, label: string, required = true): string => {
            const v = String(fd.get(name) ?? "").replace(/\s+/g, " ").trim();
            if (required && !v) throw new Error(`${label} can't be empty.`);
            if (v.length > MAX_TEXT) throw new Error(`${label} is longer than ${MAX_TEXT} characters.`);
            return v;
        };
        try {
            if (section === "rules") {
                const rulesHtml = sanitizeRulesHtml(String(fd.get("rulesHtml") ?? ""));
                if (!rulesHtml.replace(/<[^>]*>/g, "").trim()) return fail("The rules text can't be empty.");
                if (rulesHtml.length > MAX_RULES) return fail("The rules text is too long.");
                patch = { rulesHeadline: text("rulesHeadline", "Headline"), rulesLead: text("rulesLead", "Bold opening line", false), rulesHtml };
            } else {
                const steps = [0, 1, 2].map((i): Step => ({
                    title: text(`step${i}Title`, `Step ${i + 1}`),
                    text: text(`step${i}Text`, `Step ${i + 1} detail`, false),
                })) as GiveawayContent["steps"];
                patch = {
                    partner: text("partner", "Partner"),
                    prize: text("prize", "Prize"),
                    headline: text("headline", "Headline"),
                    dek: text("dek", "Intro"),
                    steps,
                    formHeading: text("formHeading", "Sign-up form heading"),
                    formSubheading: text("formSubheading", "Sign-up form subheading", false),
                    footer: text("footer", "Small print"),
                };
            }
        } catch (e) {
            return fail((e as Error).message);
        }
    }

    await saveGiveawayContent({ ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy: u.username ?? u.email ?? undefined });
    PAGES.forEach((p) => revalidatePath(p));
    const what = section === "rules" ? "official rules" : "giveaway page";
    return { ok: true, message: fd.get("intent") === "reset" ? `Reset the ${what} to the original wording.` : `Saved — the ${what} is live with your changes.`, key: Date.now() };
}
