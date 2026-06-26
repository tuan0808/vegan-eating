// src/lib/email-mask.ts
// Server-only obfuscation. The real email is never sent to the client — only
// this masked string is rendered, so it can't be lifted from the page source.
// "tech@taskco.info" -> "**ch@******.**fo"
function maskPart(s: string, keep = 2): string {
    if (s.length <= keep) return "*".repeat(s.length);
    return "*".repeat(s.length - keep) + s.slice(-keep);
}

export function maskEmail(email: string): string {
    const at = (email || "").indexOf("@");
    if (at < 1) return "•••";
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);

    const lastDot = domain.lastIndexOf(".");
    let maskedDomain: string;
    if (lastDot === -1) {
        maskedDomain = maskPart(domain);
    } else {
        const name = domain.slice(0, lastDot);
        const tld = domain.slice(lastDot + 1);
        maskedDomain = "*".repeat(name.length) + "." + maskPart(tld);
    }
    return `${maskPart(local)}@${maskedDomain}`;
}
