"use client";

// The "Forum" nav dropdown: prominent vendors + their promo codes, with a rail
// to the Vendor Deals forum board for everything else. Codes come from
// /api/vendors, which only returns the code to logged-in members — logged-out
// visitors see the vendor and a "log in" prompt, never the code.
import { useEffect, useState } from "react";
import Link from "next/link";

type PV = { id: string; name: string; url?: string; blurb?: string; hasCode: boolean; code: string | null; image?: string };
type Resp = { loggedIn: boolean; vendors: PV[]; featured: PV | null; dealsHref: string };

const FEATURE_GRADIENT = "linear-gradient(135deg,#225F27,#2f9e63 60%,#8fd19e)";

const CopyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);
const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

export default function VendorMenu({
    loggedIn,
    authReady,
    onNavigate,
}: {
    loggedIn: boolean;
    authReady: boolean;
    onNavigate: () => void;
}) {
    const [data, setData] = useState<Resp | null>(null);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        let on = true;
        fetch("/api/vendors")
            .then((r) => (r.ok ? r.json() : null))
            .then((d: Resp | null) => { if (on) (d ? setData(d) : setFailed(true)); })
            .catch(() => { if (on) setFailed(true); });
        return () => { on = false; };
    }, []);

    const copy = (id: string, code: string) => {
        navigator.clipboard?.writeText(code)
            .then(() => {
                setCopied(id);
                setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
            })
            .catch(() => {});
    };

    const dealsHref = data?.dealsHref || "/forum";
    const vendors = data?.vendors ?? [];
    const featured = data?.featured ?? null;
    const memberView = data?.loggedIn ?? loggedIn;

    // The big right-hand card. A featured ("MAIN") vendor turns it into a premium
    // ad spot — their image, linking to their site. With no featured vendor it
    // falls back to the forum (so it isn't just a duplicate of the left link).
    const featureInner = featured ? (
        <>
            <div className="vn-ph" style={featured.image ? undefined : { background: FEATURE_GRADIENT }}>
                {featured.image ? <img className="vn-ph-img" src={featured.image} alt="" /> : null}
                <span>{featured.name}</span>
            </div>
            <div className="vn-cap">
                <span className="vn-k">Featured partner</span>
                <h5>{featured.blurb || featured.name}</h5>
            </div>
        </>
    ) : (
        <>
            <div className="vn-ph" style={{ background: FEATURE_GRADIENT }}>
                <span>Vendor Deals</span>
            </div>
            <div className="vn-cap">
                <span className="vn-k">More savings</span>
                <h5>Every vendor deal in the forum</h5>
            </div>
        </>
    );

    return (
        <div className="vd-grid">
            <div className="vd-main">
                <div className="vd-head">
                    <h4>Vendor promo codes</h4>
                    {authReady && !memberView && (
                        <span className="vd-lock">
                            Members only · <Link href="/register" onClick={onNavigate}>register free</Link>
                        </span>
                    )}
                </div>

                <Link className="vd-forum-link" href={dealsHref} onClick={onNavigate}>
                    <span className="vd-forum-name">Visit the forum</span>
                    <span className="vd-forum-go">Open →</span>
                </Link>

                {failed ? (
                    <p className="vd-empty">
                        Couldn’t load deals right now. <Link href={dealsHref} onClick={onNavigate}>Visit the forum →</Link>
                    </p>
                ) : !data ? (
                    <div className="vd-skel" aria-hidden="true"><span /><span /><span /></div>
                ) : vendors.length === 0 ? (
                    <p className="vd-empty">
                        Fresh deals are posted in the <Link href={dealsHref} onClick={onNavigate}>Vendor Deals forum →</Link>
                    </p>
                ) : (
                    <ul className="vd-list">
                        {vendors.map((v) => (
                            <li className="vd-row" key={v.id}>
                                <div className="vd-info">
                                    {v.url ? (
                                        <a className="vd-name" href={v.url} target="_blank" rel="noopener noreferrer sponsored" onClick={onNavigate}>{v.name}</a>
                                    ) : (
                                        <span className="vd-name">{v.name}</span>
                                    )}
                                    {v.blurb ? <span className="vd-blurb">{v.blurb}</span> : null}
                                </div>
                                {v.code ? (
                                    <button
                                        type="button"
                                        className="vd-code"
                                        onClick={() => copy(v.id, v.code!)}
                                        title={copied === v.id ? "Copied" : "Copy code"}
                                        aria-label={copied === v.id ? "Code copied" : "Copy code"}
                                    >
                                        <span className="vd-code-text">{v.code}</span>
                                        <span className="vd-copy">{copied === v.id ? <CheckIcon /> : <CopyIcon />}</span>
                                    </button>
                                ) : v.hasCode ? (
                                    <Link href="/login" className="vd-locked" onClick={onNavigate}>Log in for code</Link>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {featured?.url ? (
                <a
                    className="vn-feature vd-feature"
                    href={featured.url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={onNavigate}
                >
                    {featureInner}
                </a>
            ) : (
                <Link className="vn-feature vd-feature" href={dealsHref} onClick={onNavigate}>
                    {featureInner}
                </Link>
            )}
        </div>
    );
}
