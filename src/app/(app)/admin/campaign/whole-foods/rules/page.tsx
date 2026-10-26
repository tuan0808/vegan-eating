// src/app/(app)/admin/campaign/whole-foods/rules/page.tsx — Campaign → Official Rules.
import type { Metadata } from "next";
import { requirePermission } from "@/lib/permissions";
import { getGiveawayContent } from "@/lib/giveaway-content";
import CampaignEditorPage from "@/components/admin/CampaignEditorPage";

export const metadata: Metadata = { title: "Campaign · Official Rules — vegan eating" };
export const dynamic = "force-dynamic";

export default async function AdminCampaignRulesPage() {
    await requirePermission("giveaway");
    return <CampaignEditorPage section="rules" content={await getGiveawayContent()} />;
}
