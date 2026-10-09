// src/lib/actions/place-photos.ts
"use server";

import { auth } from "@/auth";
import { hideAndRetryPlacePhoto } from "@/lib/place-photo-sources";

/** Admin: hide a place's photo (bad crop, wrong building) and try the next source. */
export async function hidePlacePhoto(placeId: string): Promise<{ ok: boolean }> {
    // Server actions are public endpoints: re-check the role here.
    const session = await auth();
    if (session?.user?.role !== "ADMIN" || typeof placeId !== "string") return { ok: false };
    return { ok: await hideAndRetryPlacePhoto(placeId) };
}
