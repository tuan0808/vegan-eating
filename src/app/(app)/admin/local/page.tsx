// src/app/(app)/admin/local/page.tsx — local vs online members + the Whole Foods giveaway.
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { formatDay, getLocalConfig, giveawayStatus } from "@/lib/local-markets";
import { entryBursts, isView, localMembers, localStats, VIEWS, type View } from "@/lib/local-members";
import LocalDraw from "@/components/admin/LocalDraw";
import LocalConfigEditor from "@/components/admin/LocalConfigEditor";
import IgVerifyToggle from "@/components/admin/IgVerifyToggle";
import "@/components/admin/settings.css";
import "@/components/admin/local-admin.css";

export const metadata: Metadata = { title: "Local signups — vegan eating" };
export const dynamic = "force-dynamic";

const time = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const day = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "—");

export default async function AdminLocalPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    await requirePermission("local");
    const sp = await searchParams;
    const view: View = isView(sp?.view) ? sp.view : "entries";
    const cfg = await getLocalConfig();
    const [rows, stats, bursts] = await Promise.all([localMembers(view, cfg.giveaway), localStats(cfg.markets), entryBursts()]);
    const marketName = (k: string | null) => (k ? cfg.markets.find((m) => m.key === k)?.name ?? k : null);
    const g = cfg.giveaway;
    const status = giveawayStatus(g);

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--terra, #c2603a)" }}>
                Admin · Local signups
            </p>
            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>{g.name}</h2>
                    <p>
                        {status === "open" ? "Open" : status === "upcoming" ? "Not open yet" : "Closed"} · entries {formatDay(g.start)} – {formatDay(g.end)} · drawing {formatDay(g.drawDate)}.
                        QR code → <Link href="/whole-foods?src=qr" target="_blank">/whole-foods?src=qr</Link> ·{" "}
                        <Link href="/whole-foods/rules" target="_blank">official rules</Link> (wording: <Link href="/admin/campaign/whole-foods">Campaign</Link>). A member is local when their ZIP is in a market below.
                    </p>
                </div>

                {bursts.length > 0 && (
                    <div className="la-alert">
                        <b>⚠ Signup spike{bursts.length === 1 ? "" : "s"} — possible automated entries</b>
                        <ul>
                            {bursts.slice(0, 5).map((b) => (
                                <li key={b.start.toISOString()}>
                                    {b.count} entries between {time(b.start)} and {time(b.end)} ET
                                </li>
                            ))}
                        </ul>
                        <span>Normal in-store traffic trickles in. Check those entries&rsquo; usernames, emails and IG accounts below, and ban any fakes in Members before the draw.</span>
                    </div>
                )}

                <div className="la-stats">
                    {cfg.markets.map((m, i) => (
                        <div key={m.key} className="la-stat"><b>{stats.perMarket[i]}</b><span>{m.name}</span></div>
                    ))}
                    <div className="la-stat"><b>{stats.notLocal}</b><span>Not local / no ZIP</span></div>
                    <div className="la-stat"><b>{stats.fromQr}</b><span>Signed up via the QR form</span></div>
                </div>

                <div className="la-tabs">
                    {(Object.keys(VIEWS) as View[]).map((v) => (
                        <Link key={v} href={`/admin/local?view=${v}`} className={`la-tab ${v === view ? "is-on" : ""}`}>{VIEWS[v]}</Link>
                    ))}
                    <a className="la-csv" href={`/api/admin/local-export?view=${view}`}>Download CSV</a>
                </div>

                <div className="la-table-wrap">
                    <table className="la-table">
                        <thead>
                            <tr>
                                <th>Member</th><th>Email</th><th>Instagram</th><th>Follows?</th><th>ZIP</th><th>Market</th><th>Source</th><th>Email verified</th><th>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td colSpan={9} style={{ color: "var(--muted)", padding: 16 }}>No one here yet.</td></tr>
                            )}
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td><Link href={`/u/${r.username}`}>@{r.username}</Link></td>
                                    <td className="wrap">{r.email}</td>
                                    <td>{r.igHandle ? <a href={`https://www.instagram.com/${r.igHandle}/`} target="_blank" rel="noopener noreferrer">@{r.igHandle}</a> : "—"}</td>
                                    <td>{r.igHandle ? <IgVerifyToggle userId={r.id} verified={!!r.igFollowVerifiedAt} /> : null}</td>
                                    <td>{r.zipCode ?? "—"}</td>
                                    <td>{marketName(r.localMarket) ? <span className="la-pill">{marketName(r.localMarket)}</span> : <span className="la-pill is-off">not local</span>}</td>
                                    <td>{r.signupSource?.startsWith("local:") ? <span className="la-pill">QR form</span> : "site"}</td>
                                    <td>{r.emailVerified ? "✓" : <span className="la-pill is-warn">pending</span>}</td>
                                    <td style={{ whiteSpace: "nowrap" }}>{day(r.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="la-section">
                    <h2>Draw a winner</h2>
                    <p>Uses a cryptographically random pick. Check the winner follows us on Instagram, then confirm — or redraw.</p>
                    <LocalDraw markets={cfg.markets.map(({ key, name }) => ({ key, name }))} />
                </div>

                <div className="la-section">
                    <h2>Markets &amp; dates</h2>
                    <p>
                        Markets are checked top to bottom, so a ZIP in both lands in the first. Add a city later by adding a
                        market; saving re-sorts every member with a ZIP.
                    </p>
                    <LocalConfigEditor initial={cfg} />
                </div>
            </section>
        </div>
    );
}
