// src/app/whole-foods/rules/page.tsx — official rules for the Whole Foods giveaway.
// The wording is edited at Admin → Campaign → Official Rules ([highlighted] text is a
// placeholder still to confirm). Dates come from Admin → Local signups via the
// {start}/{end}/{draw} tokens, so the rules and the form can't disagree.
// Unlike the QR page, this one wears the normal site chrome (header, PageHero,
// footer) like /recipes, since people reach it from links rather than to sign up.
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import ClientEffects from "@/components/ClientEffects";
import PageHero from "@/components/PageHero";
import { Footer } from "@/components/Sections";
import { getLocalConfig } from "@/lib/local-markets";
import { getGiveawayContent, giveawayVars, renderRulesHtml } from "@/lib/giveaway-content";
import { Copy, copyText } from "../campaign";
import "../whole-foods.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    const c = await getGiveawayContent();
    return { title: `Official rules — ${c.partner} × vegan eating giveaway`, robots: { index: false } };
}

export default async function WholeFoodsRulesPage() {
    const [{ giveaway: g }, c] = await Promise.all([getLocalConfig(), getGiveawayContent()]);
    const vars = giveawayVars(c, g);

    return (
        <>
            <Header />
            <ClientEffects />
            <main className="wf-rules">
                <PageHero
                    image="/header/recipes.jpg"
                    kicker={`${c.partner} × vegan eating`}
                    title={copyText(c.rulesHeadline, vars)}
                    dek={`Entries ${vars.start} – ${vars.end} · Winner drawn ${vars.draw}`}
                    minHeight={440}
                />

                <div className="wf-rules-body">
                    {c.rulesLead && <p className="wf-rules-lead"><Copy text={c.rulesLead} vars={vars} /></p>}
                    {/* Sanitized on save (sanitizeRulesHtml); tokens are HTML-escaped. */}
                    <div dangerouslySetInnerHTML={{ __html: renderRulesHtml(c.rulesHtml, vars) }} />
                    <Link href="/whole-foods" className="wf-rules-back">← Back to the giveaway</Link>
                </div>
            </main>
            <Footer />
        </>
    );
}
