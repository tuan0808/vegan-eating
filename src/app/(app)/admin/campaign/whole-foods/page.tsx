// src/app/(app)/admin/campaign/whole-foods/page.tsx — Campaign → Whole Foods: edit the QR giveaway page.
import type { Metadata } from "next";
import { requirePermission } from "@/lib/permissions";
import { getGiveawayContent } from "@/lib/giveaway-content";
import CampaignEditorPage from "@/components/admin/CampaignEditorPage";

export const metadata: Metadata = { title: "Campaign · Whole Foods — vegan eating" };
export const dynamic = "force-dynamic";

export default async function AdminCampaignWholeFoodsPage() {
    await requirePermission("giveaway");
    return <CampaignEditorPage section="page" content={await getGiveawayContent()} />;
}
