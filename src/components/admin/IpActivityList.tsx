// src/components/admin/IpActivityList.tsx
import { getIpActivity } from "@/lib/security-ips";
import { blockIp, unblockIp } from "@/lib/actions/ip";
import "./ip-activity.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmt(d: Date | null): string {
    if (!d) return "—";
    const x = new Date(d);
    return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
}

export default async function IpActivityList() {
    const rows = await getIpActivity(50);

    return (
        <section className="ip-panel">
            <div className="ip-head">
                <span className="ip-kicker">Activity</span>
                <h2 className="ip-title">IP addresses</h2>
                <p className="ip-sub">
                    Most active addresses across comments and forum posts. Block any that look automated.
                </p>
            </div>

            {rows.length === 0 ? (
                <p className="ip-empty">
                    No IP activity logged yet. Addresses are recorded from proxy headers in production —
                    locally they read as <code>null</code>, so this table fills in once you deploy behind a proxy.
                </p>
            ) : (
                <div className="ip-scroll">
                    <table className="ip-table">
                        <thead>
                        <tr>
                            <th>IP</th>
                            <th>Comments</th>
                            <th>Posts</th>
                            <th>Last seen</th>
                            <th>Status</th>
                            <th aria-label="actions" />
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r) => (
                            <tr key={r.ip} className={r.blocked ? "is-blocked" : ""}>
                                <td className="ip-addr">{r.ip}</td>
                                <td>{r.comments}</td>
                                <td>{r.posts}</td>
                                <td className="ip-when">{fmt(r.lastSeen)}</td>
                                <td>
                    <span className={`ip-badge ${r.blocked ? "blocked" : "ok"}`}>
                      {r.blocked ? "Blocked" : "Active"}
                    </span>
                                </td>
                                <td className="ip-action">
                                    {r.blocked ? (
                                        <form action={unblockIp}>
                                            <input type="hidden" name="ip" value={r.ip} />
                                            <button type="submit" className="ip-btn unblock">Unblock</button>
                                        </form>
                                    ) : (
                                        <form action={blockIp}>
                                            <input type="hidden" name="ip" value={r.ip} />
                                            <button type="submit" className="ip-btn block">Block</button>
                                        </form>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}