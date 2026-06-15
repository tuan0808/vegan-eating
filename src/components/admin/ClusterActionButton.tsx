// src/components/admin/ClusterActionButton.tsx
"use client";

import { blockSignupCluster } from "@/lib/actions/ip";

export default function ClusterActionButton({
                                                ip,
                                                count,
                                                blocked,
                                            }: {
    ip: string;
    count: number;
    blocked: boolean;
}) {
    if (blocked) return <span className="ip-badge blocked">IP blocked</span>;

    return (
        <form
            action={blockSignupCluster}
            onSubmit={(e) => {
                if (!window.confirm(`Block ${ip} and ban its ${count} accounts? This can be reversed later.`)) {
                    e.preventDefault();
                }
            }}
        >
            <input type="hidden" name="ip" value={ip} />
            <button type="submit" className="ip-btn block">Block IP &amp; ban accounts</button>
        </form>
    );
}