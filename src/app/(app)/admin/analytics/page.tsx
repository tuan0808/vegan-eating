// src/app/(app)/admin/analytics/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import {
    getKpis, getTrafficOverTime, getSourceBreakdown, getTopContent, getTopReferrers,
    type RangeDays, type DayPoint, type SourceSlice, type ContentRow,
} from "@/lib/analytics";
import { getSearchQueries, isGscConfigured } from "@/lib/search-console";

export const metadata: Metadata = { title: "Analytics — admin" };
export const dynamic = "force-dynamic";

const RANGES: RangeDays[] = [7, 30, 90];
const nf = new Intl.NumberFormat("en-US");
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

const SOURCE_COLOR: Record<string, string> = {
    search: "#5b6b3f", social: "#c2603a", referral: "#c79a3c", direct: "#7a8a9a", internal: "#b9b4a7",
};
const SOURCE_LABEL: Record<string, string> = {
    search: "Search", social: "Social", referral: "Referral", direct: "Direct", internal: "Internal",
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
    await requireRole(["ADMIN"]); // redirects non-admins to /dashboard

    const sp = await searchParams;
    const range = (RANGES.includes(Number(sp.range) as RangeDays) ? Number(sp.range) : 30) as RangeDays;

    const [kpis, traffic, sources, content, referrers, gsc] = await Promise.all([
        getKpis(range),
        getTrafficOverTime(range),
        getSourceBreakdown(range),
        getTopContent(range, 15),
        getTopReferrers(range, 10),
        getSearchQueries(Math.min(range, 90)),
    ]);

    return (
        <div className="am-wrap" style={{ maxWidth: "none", paddingRight: 40 }}>
            <p style={S.kicker}>Admin</p>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <h1 style={S.h1}>Analytics</h1>
                <div style={{ display: "flex", gap: 6 }}>
                    {RANGES.map((d) => (
                        <Link key={d} href={`/admin/analytics?range=${d}`} style={range === d ? S.rangeOn : S.rangeOff}>
                            {d}d
                        </Link>
                    ))}
                </div>
            </div>
            <p style={{ color: "var(--muted,#6b7264)", marginTop: 8 }}>
                First-party traffic for the public site over the last {range} days. Anonymous visits included; admin pages excluded.
            </p>

            {/* KPI cards */}
            <div style={S.kpiGrid}>
                <Kpi label="Pageviews" value={nf.format(kpis.views)} delta={kpis.viewsDelta} />
                <Kpi label="Unique visitors" value={nf.format(kpis.visitors)} />
                <Kpi label="From search" value={nf.format(kpis.searchViews)} />
                <Kpi label="Search share" value={pct(kpis.searchShare)} hint="of external visits" />
            </div>

            {/* Traffic over time */}
            <Section title="Traffic over time">
                <TrafficChart data={traffic} />
            </Section>

            <div style={S.twoCol}>
                {/* Sources */}
                <Section title="Traffic sources">
                    <SourceBars sources={sources} />
                </Section>

                {/* Top referrers */}
                <Section title="Top referrers">
                    {referrers.length === 0 ? (
                        <p style={S.empty}>No external referrers yet.</p>
                    ) : (
                        <ul style={S.list}>
                            {referrers.map((r) => (
                                <li key={r.host} style={S.listRow}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.host}</span>
                                    <b>{nf.format(r.views)}</b>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            {/* Top content */}
            <Section title="Top content">
                {content.length === 0 ? (
                    <p style={S.empty}>No views recorded yet — once the tracker is live and the table exists, data appears here.</p>
                ) : (
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={S.th}>Page</th>
                                <th style={{ ...S.th, width: 90 }}>Type</th>
                                <th style={{ ...S.thNum, width: 110 }}>Views</th>
                                <th style={{ ...S.thNum, width: 110 }}>Visitors</th>
                            </tr>
                        </thead>
                        <tbody>
                            {content.map((c) => (
                                <ContentTableRow key={c.path} row={c} />
                            ))}
                        </tbody>
                    </table>
                )}
            </Section>

            {/* Search Console */}
            <Section title="Search queries & rankings (Google Search Console)">
                <SearchConsolePanel gsc={gsc} />
            </Section>

            <p style={{ marginTop: 30 }}>
                <Link href="/admin" style={{ color: "var(--terra,#c2603a)", fontWeight: 600 }}>← Back to admin</Link>
            </p>
        </div>
    );
}

// ---- pieces ----------------------------------------------------------------

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }) {
    const up = (delta ?? 0) >= 0;
    return (
        <div style={S.card}>
            <div style={{ fontSize: 12.5, color: "var(--muted,#6b7264)", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--display,"Fraunces",serif)', color: "var(--ink,#1c2317)", marginTop: 4 }}>
                {value}
            </div>
            {delta != null ? (
                <div style={{ fontSize: 12.5, marginTop: 4, color: up ? "#41502a" : "#9a3f1f", fontWeight: 600 }}>
                    {up ? "▲" : "▼"} {pct(Math.abs(delta))} vs prev. period
                </div>
            ) : hint ? (
                <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--muted,#6b7264)" }}>{hint}</div>
            ) : null}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{ marginTop: 26 }}>
            <h2 style={S.h2}>{title}</h2>
            <div style={S.panel}>{children}</div>
        </section>
    );
}

// Dependency-free SVG bar chart: a bar per day, height ∝ views, with a visitors
// marker line. Title attrs give per-day detail on hover.
function TrafficChart({ data }: { data: DayPoint[] }) {
    if (data.every((d) => d.views === 0)) {
        return <p style={S.empty}>No traffic recorded in this window yet.</p>;
    }
    const W = 1000, H = 220, pad = 6;
    const max = Math.max(1, ...data.map((d) => d.views));
    const n = data.length;
    const slot = W / n;
    const barW = Math.max(1, slot * 0.7);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" preserveAspectRatio="none" role="img" aria-label="Daily pageviews">
            {data.map((d, i) => {
                const h = (d.views / max) * (H - pad * 2);
                const x = i * slot + (slot - barW) / 2;
                const vh = (d.visitors / max) * (H - pad * 2);
                return (
                    <g key={d.day}>
                        <title>{`${d.day}: ${d.views} views · ${d.visitors} visitors`}</title>
                        <rect x={x} y={H - pad - h} width={barW} height={h} rx={1.5} fill="#5b6b3f" opacity={0.85} />
                        <rect x={x} y={H - pad - vh} width={barW} height={2} fill="#c2603a" />
                    </g>
                );
            })}
        </svg>
    );
}

function SourceBars({ sources }: { sources: SourceSlice[] }) {
    const total = sources.reduce((s, x) => s + x.views, 0);
    if (total === 0) return <p style={S.empty}>No source data yet.</p>;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sources.filter((s) => s.views > 0).map((s) => {
                const share = s.views / total;
                return (
                    <div key={s.source}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: "var(--ink,#1c2317)" }}>{SOURCE_LABEL[s.source]}</span>
                            <span style={{ color: "var(--muted,#6b7264)" }}>{nf.format(s.views)} · {pct(share)}</span>
                        </div>
                        <div style={{ height: 8, background: "#eee9dd", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${Math.max(2, share * 100)}%`, height: "100%", background: SOURCE_COLOR[s.source] }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ContentTableRow({ row }: { row: ContentRow }) {
    const isContent = row.kind !== "page";
    return (
        <tr>
            <td style={S.td}>
                <Link href={row.path} style={{ color: "var(--terra,#c2603a)", textDecoration: "none" }}>{row.path}</Link>
            </td>
            <td style={{ ...S.td, color: "var(--muted,#6b7264)" }}>{isContent ? row.kind : "page"}</td>
            <td style={S.tdNum}><b>{nf.format(row.views)}</b></td>
            <td style={S.tdNum}>{nf.format(row.visitors)}</td>
        </tr>
    );
}

function SearchConsolePanel({ gsc }: { gsc: Awaited<ReturnType<typeof getSearchQueries>> }) {
    if (!gsc.configured) {
        return (
            <div style={{ fontSize: 14, color: "var(--ink,#1c2317)", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 10px" }}>
                    <b>Not connected.</b> This is the only place that shows the actual Google queries you rank for,
                    impressions, clicks and average position — the truest gauge of whether SEO is working.
                </p>
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>To connect (one-time):</p>
                <ol style={{ margin: 0, paddingLeft: 20, color: "var(--muted,#6b7264)" }}>
                    <li>Verify the site in Google Search Console.</li>
                    <li>Google Cloud → create a service account → enable the <i>Google Search Console API</i>.</li>
                    <li>In Search Console → Settings → Users, add the service-account email.</li>
                    <li>Set <code>GSC_SITE_URL</code>, <code>GSC_CLIENT_EMAIL</code>, <code>GSC_PRIVATE_KEY</code> and redeploy.</li>
                </ol>
            </div>
        );
    }
    if (!gsc.ok) {
        return <p style={{ ...S.empty, color: "#9a3f1f" }}>Couldn’t reach Search Console: {gsc.error}</p>;
    }
    if (gsc.rows.length === 0) {
        return <p style={S.empty}>Connected — no query data yet (new properties take a few days to populate).</p>;
    }
    return (
        <>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted,#6b7264)" }}>
                {nf.format(gsc.totals.clicks)} clicks · {nf.format(gsc.totals.impressions)} impressions (last 28 days)
            </p>
            <table style={S.table}>
                <thead>
                    <tr>
                        <th style={S.th}>Query</th>
                        <th style={{ ...S.thNum, width: 90 }}>Clicks</th>
                        <th style={{ ...S.thNum, width: 110 }}>Impressions</th>
                        <th style={{ ...S.thNum, width: 80 }}>CTR</th>
                        <th style={{ ...S.thNum, width: 90 }}>Position</th>
                    </tr>
                </thead>
                <tbody>
                    {gsc.rows.map((r) => (
                        <tr key={r.query}>
                            <td style={S.td}>{r.query}</td>
                            <td style={S.tdNum}><b>{nf.format(r.clicks)}</b></td>
                            <td style={S.tdNum}>{nf.format(r.impressions)}</td>
                            <td style={S.tdNum}>{pct(r.ctr)}</td>
                            <td style={S.tdNum}>{r.position.toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

// ---- styles ----------------------------------------------------------------

const S: Record<string, React.CSSProperties> = {
    kicker: { fontSize: 12.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--terra,#c2603a)" },
    h1: { fontFamily: 'var(--display,"Fraunces",serif)', fontSize: 32, color: "var(--ink,#1c2317)", margin: "8px 0 0" },
    h2: { fontFamily: 'var(--display,"Fraunces",serif)', fontSize: 20, color: "var(--ink,#1c2317)", margin: "0 0 12px" },
    rangeOn: { padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: "var(--terra,#c2603a)", color: "#fff", textDecoration: "none" },
    rangeOff: { padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: "#faf8f1", color: "var(--ink,#1c2317)", border: "1px solid var(--line,#e6e3da)", textDecoration: "none" },
    kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 22 },
    card: { padding: "16px 18px", background: "#faf8f1", border: "1px solid var(--line,#e6e3da)", borderRadius: 14 },
    panel: { padding: 18, background: "#fff", border: "1px solid var(--line,#e6e3da)", borderRadius: 14 },
    twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 26 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
    th: { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--line,#e6e3da)", color: "var(--muted,#6b7264)", fontWeight: 600 },
    thNum: { textAlign: "right", padding: "8px 10px", borderBottom: "2px solid var(--line,#e6e3da)", color: "var(--muted,#6b7264)", fontWeight: 600 },
    td: { padding: "8px 10px", borderBottom: "1px solid var(--line,#eee9dd)", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    tdNum: { padding: "8px 10px", borderBottom: "1px solid var(--line,#eee9dd)", textAlign: "right", color: "var(--ink,#1c2317)" },
    list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
    listRow: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, color: "var(--ink,#1c2317)" },
    empty: { color: "var(--muted,#6b7264)", fontSize: 14, margin: 0 },
};
