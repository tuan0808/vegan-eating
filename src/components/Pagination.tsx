// src/components/Pagination.tsx
import Link from "next/link";

export default function Pagination({
                                       page, totalPages, basePath, params = {},
                                   }: {
    page: number;
    totalPages: number;
    basePath: string;
    params?: Record<string, string | undefined>;
}) {
    if (totalPages <= 1) return null;

    const href = (p: number) => {
        const qs = new URLSearchParams();
        Object.keys(params).forEach((k) => {
            const v = params[k];
            if (v) qs.set(k, v);
        });
        if (p > 1) qs.set("page", String(p));
        const s = qs.toString();
        return s ? `${basePath}?${s}` : basePath;
    };

    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const nums: number[] = [];
    for (let i = start; i <= Math.min(totalPages, start + 4); i++) nums.push(i);

    return (
        <div className="pagination" style={{ marginTop: "2.5rem" }}>
            {page > 1 ? <Link className="pill" href={href(page - 1)}>← Prev</Link> : <span className="pill disabled">← Prev</span>}
            {nums.map((n) => (
                <Link key={n} href={href(n)} className={`pill${n === page ? " active" : ""}`}>{n}</Link>
            ))}
            {page < totalPages ? <Link className="pill" href={href(page + 1)}>Next →</Link> : <span className="pill disabled">Next →</span>}
        </div>
    );
}