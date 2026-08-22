// src/lib/actions/band.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saveBandCopy, saveBandVideos } from "@/lib/band-config";

export type BandResult = { ok: boolean; error?: string };

async function isAdmin(): Promise<boolean> {
    const session = await auth();
    return session?.user?.role === "ADMIN";
}

export async function saveBandCopyAction(copy: {
    heading: string;
    body: string;
    placeholder: string;
    button: string;
    success: string;
}): Promise<BandResult> {
    if (!(await isAdmin())) return { ok: false, error: "Not authorised." };
    await saveBandCopy({
        heading: copy.heading.trim(),
        body: copy.body.trim(),
        placeholder: copy.placeholder.trim(),
        button: copy.button.trim(),
        success: copy.success.trim(),
    });
    revalidatePath("/");
    return { ok: true };
}

export async function saveBandVideosAction(videos: string[]): Promise<BandResult> {
    if (!(await isAdmin())) return { ok: false, error: "Not authorised." };
    // De-dupe, trim, drop blanks — keep order.
    const seen = new Set<string>();
    const clean = videos
        .map((v) => v.trim())
        .filter((v) => v && !seen.has(v) && (seen.add(v), true));
    await saveBandVideos(clean);
    revalidatePath("/");
    return { ok: true };
}
