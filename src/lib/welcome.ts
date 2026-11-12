// src/lib/welcome.ts
import { prisma } from "./prisma";
import { sendWelcomeEmail } from "./email";
import { getWelcomeConfig } from "./newsletter-settings";
import { unsubscribeUrl } from "./unsubscribe";

// Sends the one-time welcome email to a new member. Fired at signup when email
// verification is disabled, or at verify-time when it's enabled (so it lands once
// per account either way). Honours the admin's enable + test-mode settings. Never
// throws — a mail hiccup must not break signup or the verification flow.
export async function sendWelcomeToNewMember(userId: string): Promise<void> {
    try {
        const cfg = await getWelcomeConfig();
        if (!cfg.enabled) return;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user?.email) return;

        // Test mode: route the welcome to the admin so they can approve the look
        // without emailing real new users.
        if (cfg.testMode) {
            const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { email: true } });
            if (!admin?.email) return;
            await sendWelcomeEmail(admin.email, user.name, undefined, unsubscribeUrl(admin.email));
            return;
        }

        await sendWelcomeEmail(user.email, user.name, undefined, unsubscribeUrl(user.email));
    } catch (e) {
        console.error("welcome email failed:", e);
    }
}
