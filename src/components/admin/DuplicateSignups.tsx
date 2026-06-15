// src/components/admin/DuplicateSignups.tsx
import { getDuplicateSignupIps } from "@/lib/security-ips";
import ClusterActionButton from "./ClusterActionButton";
import "./ip-activity.css"; // reuse .ip-addr / .ip-badge / .ip-btn
import "./duplicate-signups.css";

export default async function DuplicateSignups() {
    const clusters = await getDuplicateSignupIps();

    return (
        <section className="dup-panel">
            <div className="dup-head">
                <span className="dup-kicker">Bot signal</span>
                <h2 className="dup-title">Duplicate signups</h2>
                <p className="dup-sub">
                    IPs that registered more than one account — the clearest sign of automated signups.
                    Blocking the IP also bans every account that came from it.
                </p>
            </div>

            {clusters.length === 0 ? (
                <p className="dup-empty">
                    No IP has registered more than one account. Signup IPs record in production,
                    so this fills in once you&apos;re live behind a proxy.
                </p>
            ) : (
                <ul className="dup-list">
                    {clusters.map((c) => (
                        <li key={c.ip} className={`dup-cluster ${c.blocked ? "is-blocked" : ""}`}>
                            <div className="dup-cluster-head">
                                <span className="ip-addr">{c.ip}</span>
                                <span className="dup-count">{c.count} accounts</span>
                                <div className="dup-action">
                                    <ClusterActionButton ip={c.ip} count={c.count} blocked={c.blocked} />
                                </div>
                            </div>
                            <ul className="dup-users">
                                {c.users.map((u) => (
                                    <li key={u.id} className="dup-user">
                                        {u.username}
                                        {u.banned ? <span className="ip-badge blocked">banned</span> : null}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}