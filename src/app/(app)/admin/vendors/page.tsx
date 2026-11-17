// src/app/(app)/admin/vendors/page.tsx — Admin → Vendor deals.
// Staff-editable vendor promo codes surfaced in the nav Forum dropdown.
import type { Metadata } from "next";
import { requirePermission } from "@/lib/permissions";
import { getVendorConfig } from "@/lib/vendor-config";
import VendorsEditor from "./VendorsEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vendor deals — admin" };

export default async function AdminVendorsPage() {
    await requirePermission("vendors");
    const cfg = await getVendorConfig();
    return <VendorsEditor initial={cfg} />;
}
