// src/app/submit/actions.ts
"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma"; // ← if your singleton lives elsewhere (e.g. "@/lib/db"), fix this one import

// Keep in sync with src/components/SubmitRecipeForm.tsx
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB each
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type SubmitResult = { ok: boolean; error?: string };

export async function submitRecipe(formData: FormData): Promise<SubmitResult> {
    // 1. Never trust the client — re-check auth on the server.
    const user = await currentUser();
    if (!user) return { ok: false, error: "You must be logged in to submit a recipe." };

    // 2. Required text fields.
    const title = ((formData.get("title") as string) ?? "").trim();
    const dietType = ((formData.get("dietType") as string) ?? "").trim();
    const ingredients = ((formData.get("ingredients") as string) ?? "").trim();
    const method = ((formData.get("method") as string) ?? "").trim();

    if (!title || !ingredients || !method) {
        return { ok: false, error: "Title, ingredients and method are all required." };
    }
    if (dietType !== "VEGAN" && dietType !== "VEGETARIAN") {
        return { ok: false, error: "Please choose vegan or vegetarian." };
    }

    // 3. Optional time fields (non-negative ints, else null).
    const toInt = (v: FormDataEntryValue | null): number | null => {
        const n = parseInt((v as string) ?? "", 10);
        return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const prepMin = toInt(formData.get("prepMin"));
    const cookMin = toInt(formData.get("cookMin"));
    const readyMin = toInt(formData.get("readyMin"));

    // 4. Images — validate count, type and size, then write to /public/uploads.
    const files = formData
        .getAll("images")
        .filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length > MAX_IMAGES) {
        return { ok: false, error: `You can upload at most ${MAX_IMAGES} images.` };
    }

    const savedPaths: string[] = [];
    if (files.length) {
        const folder = randomUUID();
        const destDir = path.join(process.cwd(), "public", "uploads", "submissions", folder);
        await mkdir(destDir, { recursive: true });

        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                return { ok: false, error: "Images must be JPG, PNG, WEBP or GIF." };
            }
            if (file.size > MAX_IMAGE_BYTES) {
                return { ok: false, error: `Each image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.` };
            }
            const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
            const filename = `${randomUUID()}.${ext}`;
            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(path.join(destDir, filename), buffer);
            savedPaths.push(`/uploads/submissions/${folder}/${filename}`);
        }
    }

    // 5. Persist as a PENDING submission (a human reviews before it becomes a real Recipe).
    await prisma.recipeSubmission.create({
        data: {
            title,
            dietType,
            ingredients,
            method,
            prepMin,
            cookMin,
            readyMin,
            images: JSON.stringify(savedPaths),
            status: "PENDING",
            userId: user.id ?? null,
            authorName: user.name ?? user.username ?? null,
        },
    });

    // Harmless if the review route doesn't exist yet.
    revalidatePath("/admin/submissions");
    return { ok: true };
}