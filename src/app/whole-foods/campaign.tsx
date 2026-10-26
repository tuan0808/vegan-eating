// src/app/whole-foods/campaign.tsx
//
// The page copy itself lives in the DB (src/lib/giveaway-content.ts, edited at
// Admin → Campaign). This renders one of its short text fields: {tokens}
// filled in, *word* in the italic accent, {rules} as a link to the official
// rules, and "[placeholder]" highlighted so it can't slip onto a printed QR card
// unnoticed.
import Link from "next/link";

export const CAMPAIGN = "whole-foods";

export function Copy({ text, vars }: { text: string; vars: Record<string, string> }) {
    return (
        <>
            {text.split(/(\{\w+\}|\*[^*]+\*|\[[^\]]+\])/).map((part, i) => {
                if (i % 2 === 0) return part;
                if (part === "{rules}") return <Link key={i} href="/whole-foods/rules">official rules</Link>;
                if (part.startsWith("{")) return vars[part.slice(1, -1)] ?? part;
                if (part.startsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
                return <mark key={i} className="wf-tbd">{part}</mark>;
            })}
        </>
    );
}

/** Plain string version, for <title> and form props. */
export function copyText(text: string, vars: Record<string, string>): string {
    return text.replace(/\{(\w+)\}/g, (m, k: string) => (k === "rules" ? "official rules" : vars[k] ?? m)).replace(/\*([^*]+)\*/g, "$1");
}
