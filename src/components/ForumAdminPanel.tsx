// src/components/ForumAdminPanel.tsx
import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import "./forum-panels.css";

/**
 * Renders nothing for non-admins, so it's safe to drop into a public page —
 * it self-gates on the session role. Links point at the admin areas you already
 * have; the "soon" items are placeholders for features still to be built.
 */
export default async function ForumAdminPanel() {
    const user = await currentUser();
    if (!user || user.role !== "ADMIN") return null;

    return (
        <div className="fpanel-wrap">
            <div className="fpanel fpanel-admin">
                <div className="fpanel-head">Admin Control Panel</div>
                <div className="fpanel-body">
                    <div className="fadmin-actions">
                        <Link href="/admin/forums" className="fadmin-primary">+ Add category or board</Link>
                        <Link href="/admin/forums" className="fadmin-btn">Manage &amp; reorder boards</Link>
                        <Link href="/admin" className="fadmin-btn">Members &amp; roles</Link>
                        <span className="fadmin-btn soon">Post moderation <em>soon</em></span>
                        <span className="fadmin-btn soon">Antispam <em>soon</em></span>
                    </div>
                    <p className="fadmin-note">
                        Only admins see this panel. It mirrors the tools in the admin area for quick access while browsing.
                    </p>
                </div>
            </div>
        </div>
    );
}