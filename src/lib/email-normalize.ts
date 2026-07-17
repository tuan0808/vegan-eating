// src/lib/email-normalize.ts
//
// Canonicalises an email to the *inbox it actually delivers to*, so the dot- and
// plus-trick can't mint unlimited "unique" addresses from one mailbox:
//   e.hofu.p.u.do.y.0.7@gmail.com  →  ehofupudoy07@gmail.com
//   caleb.jackson+spam@gmail.com   →  calebjackson@gmail.com
//
// Gmail (and googlemail.com) ignore dots in the local part entirely and treat
// everything after a "+" as a discardable tag. Plenty of other providers honour
// "+tag" sub-addressing too, so we strip that everywhere; dot-stripping is Gmail
// only (other hosts DO distinguish dots). We store the result in User.normalizedEmail
// and enforce uniqueness on it at signup — the raw address is still what we email.

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function normalizeEmail(raw: string): string {
    const email = raw.trim().toLowerCase();
    const at = email.lastIndexOf("@");
    if (at <= 0) return email; // not an address we can split — return as-is

    let local = email.slice(0, at);
    const domain = email.slice(at + 1);

    // "+tag" sub-addressing → drop the tag (RFC 5233; honoured by Gmail, Outlook, etc.)
    const plus = local.indexOf("+");
    if (plus !== -1) local = local.slice(0, plus);

    const isGmail = GMAIL_DOMAINS.has(domain);
    if (isGmail) local = local.replace(/\./g, ""); // Gmail ignores dots

    const normDomain = domain === "googlemail.com" ? "gmail.com" : domain;
    return `${local}@${normDomain}`;
}

/** How many dots the Gmail local part carries — a bot tell (humans rarely dot heavily). */
export function gmailDotCount(raw: string): number {
    const email = raw.trim().toLowerCase();
    const at = email.lastIndexOf("@");
    if (at <= 0) return 0;
    const local = email.slice(0, at).split("+")[0];
    const domain = email.slice(at + 1);
    if (!GMAIL_DOMAINS.has(domain)) return 0;
    return (local.match(/\./g) || []).length;
}
