// src/app/(app)/admin/categories/page.tsx
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import CategoriesSection from "@/components/admin/CategoriesSection";

export const metadata: Metadata = { title: "Categories — vegan eating" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
    await requireRole(["ADMIN"]);

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
                Admin · Recipes
            </p>
            <CategoriesSection />
        </div>
    );
}
