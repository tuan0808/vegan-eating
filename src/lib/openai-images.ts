// src/lib/openai-images.ts
// Low-level OpenAI image generation wrappers (gpt-image-2).
// SERVER ONLY — never import this from a client component (the key must stay server-side).

import OpenAI, { toFile } from "openai";

export type ImageQuality = "low" | "medium" | "high";
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

const MODEL = "gpt-image-2";

// Per-call timeout so a hung request fails in 3 min instead of the SDK's 10-min
// default. maxRetries: 0 — we do our own targeted retry (429/5xx) in withRetry,
// so the SDK shouldn't silently multiply attempts on top of it.
const REQUEST_TIMEOUT_MS = 360_000; // 6 min — high-quality gpt-image-2 calls can run 3-4 min each

let _client: OpenAI | null = null;
function client(): OpenAI {
    if (!_client) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set");
        }
        _client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: REQUEST_TIMEOUT_MS,
            maxRetries: 0,
        });
    }
    return _client;
}

// Retry with exponential backoff + jitter on 429 / 5xx only. AbortErrors and
// timeouts have no http status, so they fall straight through (no retry) — which
// is what we want for a user cancel or a hang.
async function withRetry<T>(fn: () => Promise<T>, label: string, max = 3): Promise<T> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn();
        } catch (err: any) {
            // Never retry a user cancel.
            if (err?.name === "AbortError" || err?.name === "APIUserAbortError") throw err;
            const status = err?.status ?? err?.response?.status ?? 0;
            const m = String(err?.message || "").toLowerCase();
            const isTimeout =
                err?.name === "APIConnectionTimeoutError" ||
                err?.code === "ETIMEDOUT" ||
                m.includes("timed out") ||
                m.includes("timeout");
            const retryable = status === 429 || (status >= 500 && status < 600) || isTimeout;
            attempt++;
            if (!retryable || attempt > max) throw err;
            const base = Math.min(1000 * 2 ** attempt, 20000);
            const jitter = Math.random() * 500;
            const wait = Math.round(base + jitter);
            console.warn(`[openai-images] ${label} attempt ${attempt} failed (status ${status}); retrying in ${wait}ms`);
            await new Promise((r) => setTimeout(r, wait));
        }
    }
}

// Text-to-image. Used for the fresh hero shot. Returns a PNG buffer.
// (GPT Image models always return base64 — there is no URL response.)
export async function generateImage(opts: {
    prompt: string;
    size?: ImageSize;
    quality?: ImageQuality;
    signal?: AbortSignal;
}): Promise<Buffer> {
    const { prompt, size = "1536x1024", quality = "medium", signal } = opts;
    const res = await withRetry(
        () =>
            client().images.generate(
                { model: MODEL, prompt, size, quality },
                { signal }
            ),
        "generate"
    );
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image data (generate)");
    return Buffer.from(b64, "base64");
}

// Image-to-image edit. Used for step images so they stay visually consistent with
// the hero — same dishware, palette, lighting.
//
// NOTE: gpt-image-2 does NOT accept input_fidelity (it 400s). The model always
// processes image inputs at high fidelity automatically, so the consistency we
// wanted is on by default — there's no knob to set. The trade-off is that
// reference edits cost more input tokens.
export async function generateFromReference(opts: {
    reference: Buffer;
    prompt: string;
    size?: ImageSize;
    quality?: ImageQuality;
    signal?: AbortSignal;
    referenceName?: string;
    referenceType?: string;
}): Promise<Buffer> {
    const { reference, prompt, size = "1024x1024", quality = "medium", signal } = opts;
    const refFile = await toFile(reference, opts.referenceName || "reference.png", {
        type: opts.referenceType || "image/png",
    });
    const res = await withRetry(
        () =>
            client().images.edit(
                { model: MODEL, image: refFile, prompt, size, quality },
                { signal }
            ),
        "edit"
    );
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image data (edit)");
    return Buffer.from(b64, "base64");
}