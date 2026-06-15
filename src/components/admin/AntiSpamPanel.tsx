// src/components/admin/AntiSpamPanel.tsx
// Renders only for admins; the save action is independently admin-gated.
import { currentUser } from "@/lib/auth-helpers";
import { getAntiSpamConfig, getAntiSpamStats } from "@/lib/antispam-config";
import AntiSpamForm from "./AntiSpamForm";
import "./antispam-panel.css";

export default async function AntiSpamPanel() {
    const user = await currentUser();
    if (user?.role !== "ADMIN") return null;

    const [cfg, stats] = await Promise.all([getAntiSpamConfig(), getAntiSpamStats()]);

    return (
        <section className="as-panel">
            <div className="as-head">
                <span className="as-kicker">Security</span>
                <h2 className="as-title">Anti-spam</h2>
            </div>

            <div className="as-stats">
                <div className="as-stat">
                    <span className="as-num">{stats.blockedIps}</span>
                    <span className="as-lbl">blocked IPs</span>
                </div>
                <div className="as-stat">
                    <span className="as-num">{stats.bannedUsers}</span>
                    <span className="as-lbl">banned users</span>
                </div>
                <div className="as-stat">
                    <span className="as-num">{stats.spamComments}</span>
                    <span className="as-lbl">spam comments</span>
                </div>
            </div>

            <AntiSpamForm config={cfg} />
        </section>
    );
}
