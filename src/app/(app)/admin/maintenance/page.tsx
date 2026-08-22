// src/app/(app)/admin/maintenance/page.tsx
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import MaintenanceSection from "@/components/admin/MaintenanceSection";
import WelcomeEmailSection from "@/components/admin/WelcomeEmailSection";
import NewsletterSection from "@/components/admin/NewsletterSection";
import NewsletterVideosSection from "@/components/admin/NewsletterVideosSection";
import SettingsTabs from "@/components/admin/SettingsTabs";
import {
    getWelcomeConfig,
    getWelcomeEmail,
    getNewsletter,
    DEFAULT_WELCOME_SUBJECT,
    DEFAULT_WELCOME_HTML,
} from "@/lib/newsletter-settings";
import { recipientCount } from "@/lib/actions/newsletter-admin";
import { getBandConfig } from "@/lib/band-config";
import "@/components/admin/settings.css";
import "@/components/admin/newsletter-admin.css";

export const metadata: Metadata = { title: "Site settings — vegan eating" };
export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
    await requireRole(["ADMIN"]);

    const [welcome, welcomeEmail, nl, count, band] = await Promise.all([
        getWelcomeConfig(),
        getWelcomeEmail(),
        getNewsletter(),
        recipientCount().catch(() => 0),
        getBandConfig(),
    ]);

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            <p
                style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--terra, #c2603a)",
                }}
            >
                Admin · Site settings
            </p>

            <SettingsTabs labels={["Maintenance", "Welcome email", "Newsletter", "Newsletter videos"]}>
                <MaintenanceSection />

                <section className="settings-section">
                    <div className="settings-section-head">
                        <h2>Welcome email</h2>
                        <p>A warm hello sent automatically the moment a member verifies their email.</p>
                    </div>
                    <WelcomeEmailSection
                        enabled={welcome.enabled}
                        testMode={welcome.testMode}
                        subject={welcomeEmail.subject}
                        html={welcomeEmail.html}
                        defaultSubject={DEFAULT_WELCOME_SUBJECT}
                        defaultHtml={DEFAULT_WELCOME_HTML}
                    />
                </section>

                <section className="settings-section">
                    <div className="settings-section-head">
                        <h2>Newsletter</h2>
                        <p>Compose an update, preview it live, send yourself a test, then broadcast to your members.</p>
                    </div>
                    <NewsletterSection subject={nl.subject} html={nl.html} recipientCount={count} />
                </section>

                <NewsletterVideosSection band={band} />
            </SettingsTabs>
        </div>
    );
}
