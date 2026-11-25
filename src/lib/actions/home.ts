// src/lib/actions/home.ts
"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings";
import { currentUser } from "@/lib/auth-helpers";
import type { HomeLead } from "@/lib/home-config";

// Site-wide state — the Settings page only HIDES the control; this guard is the
// real boundary against a crafted POST.
async function requireAdmin() {
    const user = await currentUser();
    if (user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function setHomeLead(view: HomeLead) {
    await requireAdmin();
    await setSetting("home.lead", view === "carousel" ? "carousel" : "banner");
    // The lead element is chosen in the home page itself, so revalidate "/".
    revalidatePath("/");
}
