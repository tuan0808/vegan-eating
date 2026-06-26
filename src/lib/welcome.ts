// src/lib/welcome.ts
import { prisma } from "./prisma";
import { sendWelcomeEmail } from "./email";
import { getWelcomeConfig } from "./newsletter-settings";

// Fired after a user verifies their email. Honours the admin's enable + test-mode
// settings. Never throws — a mail hiccup must not break the verification flow.
export async function sendWelcomeOnVerify(userId: string): Promise<void> {
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
            await sendWelcomeEmail(admin.email, user.name);
            return;
        }

        await sendWelcomeEmail(user.email, user.name);
    } catch (e) {
        console.error("welcome email failed:", e);
    }
}
