// src/components/admin/SuspiciousAccounts.tsx
import { getSuspiciousAccounts } from "@/lib/suspicious-accounts";
import SuspiciousAccountsList from "./SuspiciousAccountsList";
import "./duplicate-signups.css"; // reuse .dup-* panel styling

export default async function SuspiciousAccounts() {
    const accounts = await getSuspiciousAccounts();

    return (
        <section className="dup-panel">
            <div className="dup-head">
                <span className="dup-kicker">Bot signal</span>
                <h2 className="dup-title">Suspicious accounts</h2>
                <p className="dup-sub">
                    Members flagged by bot signals — machine-random usernames/display names, the
                    Gmail dot/&ldquo;+tag&rdquo; trick, or accounts sharing one inbox or signup IP.
                    Review the reasons, then ban (reversible) or delete. Staff are never flagged.
                </p>
            </div>

            {accounts.length === 0 ? (
                <p className="dup-empty">No accounts currently match the bot signals.</p>
            ) : (
                <SuspiciousAccountsList
                    accounts={accounts.map((a) => ({
                        id: a.id,
                        username: a.username,
                        name: a.name,
                        email: a.email,
                        joined: a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                        banned: a.banned,
                        signupIp: a.signupIp,
                        score: a.score,
                        signals: a.signals,
                    }))}
                />
            )}
        </section>
    );
}
