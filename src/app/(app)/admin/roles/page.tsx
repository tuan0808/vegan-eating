// src/app/(app)/admin/roles/page.tsx — choose what each role can do in the admin area.
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, allRoles, getRoleConfig } from "@/lib/permissions";
import RolesEditor from "@/components/admin/RolesEditor";
import "@/components/admin/settings.css";
import "@/components/admin/roles-admin.css";

export const metadata: Metadata = { title: "Roles — vegan eating" };
export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
    await requireRole(["ADMIN"]);
    const [roles, config, counts] = await Promise.all([
        allRoles(),
        getRoleConfig(),
        prisma.user.groupBy({ by: ["role"], _count: true }),
    ]);
    const members = Object.fromEntries(counts.map((c) => [c.role, c._count]));

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            <p
                style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--terra, #c2603a)",
                }}
            >
                Admin · Roles
            </p>
            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>Roles &amp; access</h2>
                    <p>
                        Tick what each role can open in the admin area, then Save. Admins always have everything.
                        Add a role for a new job (e.g. Social media), then assign it to people on the Members page.
                    </p>
                </div>
                <RolesEditor
                    roles={roles}
                    initialGrants={config.grants}
                    permissions={PERMISSIONS.map((p) => ({ key: p.key, label: p.label, hint: p.hint }))}
                    members={members}
                />
                <p className="muted roles-locked">
                    Always admin-only: Members, Roles, Security, Site settings (incl. newsletter) and submissions.
                    Forum and comment moderation comes with the Moderator role. Every role keeps normal member
                    privileges on the site.
                </p>
            </section>
        </div>
    );
}
