// src/lib/recipe-image-pipeline.ts
// Orchestrates a full AI image set for one recipe. Three modes:
//   - "generate": make a fresh hero (text-to-image), then step photos that match it.
//   - "existing": use the recipe's current image as the reference; keep it as the
//                 hero (no new hero generated) and only generate matching steps.
//   - "hero":     make a fresh hero and STOP — no step images touched.
// Pure logic — no DB, no Next imports. Emits unified progress via opts.onProgress.

import {
    generateImage,
    generateFromReference,
    type ImageQuality,
} from "@/lib/openai-images";
import { uploadPngToSpaces, loadImageBuffer } from "@/lib/spaces-upload";

// ---- Guardrails -----------------------------------------------------------
export const MAX_STEPS = 12; // cap step images per recipe (cost + sanity)
export const MAX_IMAGES_PER_RUN = MAX_STEPS + 1;
const STEP_CONCURRENCY = 4; // parallel step generations; lower this if you hit 429 rate limits
const ROUGH_USD_PER_IMAGE = 0.08; // gpt-image-2 medium — ROUGH. Tune from your usage dashboard.

export type ReferenceMode = "generate" | "existing" | "hero";

export type RecipeInput = {
    slug: string;
    title: string;
    ingredients: string; // JSON string from Recipe.ingredients
    steps: string; // JSON string from Recipe.steps
};

// Single progress event type — mode-agnostic. `done` counts generated images;
// the panel knows `total` from the route's "start" event.
export type GenProgress = { type: "progress"; done: number; label: string };

export type GeneratedSet = {
    heroUrl: string | null; // null in "existing" mode (hero unchanged)
    stepUrls: string[]; // aligned to parsed steps order; "" = that step failed
    imagesGenerated: number;
    failed: number;
    estimatedCostUsd: number;
};

// ---- Tolerant parsers (your steps/ingredients may be strings or objects) ----
function parseJsonArray(raw: string): any[] {
    try {
        const v = JSON.parse(raw || "[]");
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

export function extractSteps(stepsJson: string): string[] {
    return parseJsonArray(stepsJson)
        .map((s) => {
            if (typeof s === "string") return s;
            if (s && typeof s === "object") return s.text || s.step || s.body || s.content || "";
            return "";
        })
        .map((s) => String(s).trim())
        .filter(Boolean);
}

export function extractIngredientNames(ingredientsJson: string): string[] {
    return parseJsonArray(ingredientsJson)
        .map((i) => {
            if (typeof i === "string") return i;
            if (i && typeof i === "object") return i.name || i.text || i.ingredient || i.item || "";
            return "";
        })
        .map((s) => String(s).trim())
        .filter(Boolean);
}

// ---- Prompt builders ------------------------------------------------------
const STYLE = [
    "Photorealistic food photography, natural soft daylight, shallow depth of field,",
    "rustic wood or stone surface, neutral props, appetizing and clean.",
    "No text, no labels, no watermarks.",
].join(" ");

function buildHeroPrompt(r: RecipeInput, ingredients: string[]): string {
    const ing = ingredients.slice(0, 8).join(", ");
    return [
        `A beautifully plated finished dish: "${r.title}", a vegan recipe.`,
        ing ? `Made with ${ing}.` : "",
        "Three-quarter overhead angle, the finished dish as the hero of the frame.",
        STYLE,
    ]
        .filter(Boolean)
        .join(" ");
}

function buildStepPrompt(
    r: RecipeInput,
    step: string,
    idx: number,
    total: number,
    ingredients: string[]
): string {
    const ing = ingredients.slice(0, 6).join(", ");
    return [
        `In-progress cooking photo for the vegan recipe "${r.title}", step ${idx + 1} of ${total}.`,
        `Show this action: ${step}.`,
        ing ? `Relevant ingredients: ${ing}.` : "",
        "Match the dishware, surface, color palette and lighting of the reference image so the whole set looks like one photo shoot.",
        STYLE,
    ]
        .filter(Boolean)
        .join(" ");
}

// ---- Tiny concurrency limiter (no extra dependency) -----------------------
async function mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let cursor = 0;
    async function worker() {
        while (cursor < items.length) {
            const i = cursor++;
            out[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, worker));
    return out;
}

// ---- Main -----------------------------------------------------------------
export async function generateRecipeImageSet(
    recipe: RecipeInput,
    opts: {
        quality?: ImageQuality;
        onProgress?: (ev: GenProgress) => void;
        signal?: AbortSignal;
        referenceMode?: ReferenceMode;
        existingImageUrl?: string | null;
    } = {}
): Promise<GeneratedSet> {
    const quality = opts.quality || "medium";
    const emit = opts.onProgress || (() => {});
    const signal = opts.signal;
    const mode: ReferenceMode = opts.referenceMode || "generate";
    const throwIfAborted = () => {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    };

    const ingredients = extractIngredientNames(recipe.ingredients);
    const steps = extractSteps(recipe.steps).slice(0, MAX_STEPS); // hard cap
    const ts = Date.now();

    let done = 0;

    // ---- Establish the reference image (and hero) ----
    let heroUrl: string | null;
    let refBuf: Buffer;
    let refName = "reference.png";
    let refType = "image/png";

    throwIfAborted();
    if (mode === "existing" && opts.existingImageUrl) {
        // Use the recipe's current photo as the anchor; keep it as the hero.
        const loaded = await loadImageBuffer(opts.existingImageUrl);
        refBuf = loaded.buffer;
        refName = loaded.name;
        refType = loaded.contentType;
        heroUrl = null; // hero unchanged
        emit({ type: "progress", done, label: "Using your current photo as the reference…" });
    } else {
        // Generate a fresh hero and anchor the steps to it ("generate" and "hero").
        const heroBuf = await generateImage({
            prompt: buildHeroPrompt(recipe, ingredients),
            size: "1536x1024",
            quality,
        });
        const hero = await uploadPngToSpaces(heroBuf, `uploads/recipes/${recipe.slug}/ai/hero-${ts}.png`);
        heroUrl = hero.url;
        refBuf = heroBuf;
        done++;
        emit({
            type: "progress",
            done,
            label: mode === "hero" ? "Hero ready." : "Hero ready · generating steps…",
        });
    }

    // ---- Hero-only run: stop here, leave step photos untouched. ----
    if (mode === "hero") {
        const generated = heroUrl ? 1 : 0;
        return {
            heroUrl,
            stepUrls: [],
            imagesGenerated: generated,
            failed: 0,
            estimatedCostUsd: +(generated * ROUGH_USD_PER_IMAGE).toFixed(2),
        };
    }

    // ---- Step images (edits anchored to the reference) ----
    let completed = 0;
    const stepUrls = await mapLimit(steps, STEP_CONCURRENCY, async (step, i) => {
        throwIfAborted();
        try {
            const buf = await generateFromReference({
                reference: refBuf,
                referenceName: refName,
                referenceType: refType,
                prompt: buildStepPrompt(recipe, step, i, steps.length, ingredients),
                size: "1024x1024",
                quality,
                signal,
            });
            const up = await uploadPngToSpaces(buf, `uploads/recipes/${recipe.slug}/ai/step-${i + 1}-${ts}.png`);
            completed++;
            done++;
            emit({ type: "progress", done, label: `Generating steps… (${completed}/${steps.length})` });
            return up.url;
        } catch (err) {
            if (signal?.aborted) throw err; // a real cancel still aborts the whole run
            completed++;
            done++;
            emit({ type: "progress", done, label: `Generating steps… (${completed}/${steps.length})` });
            console.error(`[pipeline] step ${i + 1} failed, continuing:`, err);
            return ""; // placeholder keeps step alignment; regenerate to fill the gap
        }
    });

    const succeeded = stepUrls.filter(Boolean).length;
    const failed = stepUrls.length - succeeded;
    const imagesGenerated = (heroUrl ? 1 : 0) + succeeded;
    return {
        heroUrl,
        stepUrls,
        imagesGenerated,
        failed,
        estimatedCostUsd: +(imagesGenerated * ROUGH_USD_PER_IMAGE).toFixed(2),
    };
}

// Used to show a cost estimate / total before spending anything.
// `steps` = number of step images, `total` = steps + hero (generate mode).
export function estimateImageCount(stepsJson: string): {
    steps: number;
    total: number;
    estimatedCostUsd: number;
} {
    const steps = Math.min(extractSteps(stepsJson).length, MAX_STEPS);
    const total = steps + 1; // + hero (generate mode)
    return { steps, total, estimatedCostUsd: +(total * ROUGH_USD_PER_IMAGE).toFixed(2) };
}