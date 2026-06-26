// src/components/admin/EmailSettingsSection.tsx
import WelcomeEmailSection from "./WelcomeEmailSection";
import NewsletterSection from "./NewsletterSection";
import { getWelcomeConfig, getWelcomeEmail, getNewsletter } from "@/lib/newsletter-settings";
import { recipientCount } from "@/lib/actions/newsletter-admin";
import "./settings.css";
import "./newsletter-admin.css";

export default async function EmailSettingsSection() {
    const [welcome, welcomeEmail, nl, count] = await Promise.all([
        getWelcomeConfig(),
        getWelcomeEmail(),
        getNewsletter(),
        recipientCount().catch(() => 0),
    ]);

    return (
        <>
            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>Welcome email</h2>
                    <p>A warm hello sent automatically the moment a member verifies their email.</p>
                </div>
                <WelcomeEmailSection enabled={welcome.enabled} testMode={welcome.testMode} subject={welcomeEmail.subject} html={welcomeEmail.html} />
            </section>

            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>Newsletter</h2>
                    <p>Compose an update, preview it live, send yourself a test, then broadcast to your members.</p>
                </div>
                <NewsletterSection subject={nl.subject} html={nl.html} recipientCount={count} />
            </section>
        </>
    );
}
