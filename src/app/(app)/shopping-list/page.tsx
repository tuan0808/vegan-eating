// src/app/(app)/shopping-list/page.tsx
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { shoppingList, shoppingCounts } from "@/lib/kitchen";
import ShoppingList from "@/components/kitchen/ShoppingList";
import "@/styles/community.css";
import "@/styles/kitchen.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shopping list — vegan eating" };

export default async function ShoppingListPage() {
    const user = await requireUser();
    const [groups, counts] = await Promise.all([
        shoppingList(user.id),
        shoppingCounts(user.id),
    ]);

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">Kitchen</p>
            <h1 className="cm-h1">Shopping list</h1>
            <p className="cm-sub">
                {counts.total === 0
                    ? "Add ingredients straight from any recipe, then print and go."
                    : `${counts.remaining} to get · ${counts.checked} ticked off`}
            </p>

            <ShoppingList groups={groups} />
        </div>
    );
}