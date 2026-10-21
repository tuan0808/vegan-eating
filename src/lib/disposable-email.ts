// src/lib/disposable-email.ts
//
// Throwaway-inbox services (mailinator & co.). A bot farming accounts needs a
// readable inbox per account; these hand them out free and instantly, so we
// refuse them at signup and on email change. Not exhaustive — it covers the big
// public ones. Subdomains match too (e.g. foo.mailinator.com).

const DOMAINS = new Set([
    "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonbox.net",
    "burnermail.io", "byom.de", "discard.email", "discardmail.com", "dispostable.com",
    "dropmail.me", "emailondeck.com", "emailfake.com", "fakeinbox.com", "fakemail.net",
    "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de",
    "guerrillamail.info", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "grr.la",
    "harakirimail.com", "inboxbear.com", "incognitomail.org", "jetable.org", "mail.tm",
    "mail-temp.com", "maildrop.cc", "mailcatch.com", "mailinator.com", "mailinator.net",
    "mailinator2.com", "mailnesia.com", "mailpoof.com", "mailsac.com", "mintemail.com",
    "moakt.com", "mohmal.com", "mytemp.email", "mytrashmail.com", "nada.email",
    "sharklasers.com", "spam4.me", "spambog.com", "spamgourmet.com", "tempail.com",
    "tempinbox.com", "tempmail.com", "tempmail.net", "tempmail.plus", "tempmailo.com",
    "temp-mail.io", "temp-mail.org", "tempr.email", "throwawaymail.com", "trashmail.com",
    "trashmail.de", "trashmail.net", "yopmail.com", "yopmail.fr", "yopmail.net",
    "emailnax.com", "1secmail.com", "1secmail.net", "1secmail.org", "linshiyouxiang.net",
]);

export function isDisposableEmail(email: string): boolean {
    let domain = email.trim().toLowerCase().split("@").pop() ?? "";
    while (domain) {
        if (DOMAINS.has(domain)) return true;
        const dot = domain.indexOf(".");
        if (dot === -1) break;
        domain = domain.slice(dot + 1);
    }
    return false;
}
