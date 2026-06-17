// scripts/upload-images.ts
//
// PASS 2 of 3 — provider-agnostic; needs the SPACES_* env vars (same ones the
// app uses). Uploads local CONTENT images to Spaces under the SAME key they had
// under public/, and writes old-DB-path -> new-CDN-URL to ./_dump/image-map.json.
//
//   export $(grep '^SPACES_' .env | xargs)
//   npx tsx scripts/upload-images.ts
//
// Content roots are auto-discovered under public/: every top-level YYYY folder
// (the WP-imported recipe/article photos live at public/2025/01/... etc.) plus
// the app's own "uploads" folder. App chrome — favicons, og images, /header/*,
// icons, and public/media (maintenance-mode backgrounds) — is deliberately NOT
// migrated; it's referenced from code/settings and stays in the repo.
//
// Override the auto-discovery with IMAGE_ROOTS="public/2025,public/uploads".

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC_DIR = path.resolve("public");
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);
const CONCURRENCY = 8;

const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT!;
const SPACES_BUCKET = process.env.SPACES_BUCKET!;
const SPACES_KEY = process.env.SPACES_KEY!;
const SPACES_SECRET = process.env.SPACES_SECRET!;
const SPACES_REGION = process.env.SPACES_REGION || "us-east-1";
const SPACES_PUBLIC_BASE =
    process.env.SPACES_PUBLIC_BASE ||
    SPACES_ENDPOINT.replace("://", `://${SPACES_BUCKET}.`);

if (!SPACES_ENDPOINT || !SPACES_BUCKET || !SPACES_KEY || !SPACES_SECRET) {
    console.error("Missing SPACES_* env vars. Run: export $(grep '^SPACES_' .env | xargs)");
    process.exit(1);
}

const s3 = new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: SPACES_REGION,
    forcePathStyle: false,
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
});

const CT: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
};

// Content roots = top-level YYYY dirs + "uploads", unless IMAGE_ROOTS overrides.
async function discoverRoots(): Promise<string[]> {
    if (process.env.IMAGE_ROOTS) {
        return process.env.IMAGE_ROOTS.split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((p) => path.resolve(p));
    }
    const entries = await readdir(PUBLIC_DIR, { withFileTypes: true });
    const roots: string[] = [];
    for (const e of entries) {
        if (e.isDirectory() && (/^\d{4}$/.test(e.name) || e.name === "uploads")) {
            roots.push(path.join(PUBLIC_DIR, e.name));
        }
    }
    return roots;
}

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        console.warn(`(skip) not found: ${dir}`);
        return acc;
    }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full, acc);
        else if (EXTS.has(path.extname(e.name).toLowerCase())) acc.push(full);
    }
    return acc;
}

async function main() {
    const roots = await discoverRoots();
    console.log(`content roots: ${roots.map((r) => path.relative(process.cwd(), r)).join(", ") || "(none)"}`);
    const files = (await Promise.all(roots.map((r) => walk(r)))).flat();
    console.log(`found ${files.length} content images`);

    const map: Record<string, string> = {};
    let done = 0;

    async function upload(file: string) {
        const rel = path.relative(PUBLIC_DIR, file).split(path.sep).join("/"); // e.g. 2025/01/foo.jpg
        const ext = path.extname(file).toLowerCase();
        const body = await readFile(file);
        await s3.send(
            new PutObjectCommand({
                Bucket: SPACES_BUCKET,
                Key: rel,
                Body: body,
                ContentType: CT[ext] || "application/octet-stream",
                ACL: "public-read",
                CacheControl: "public, max-age=31536000, immutable",
            }),
        );
        const cdn = `${SPACES_PUBLIC_BASE.replace(/\/+$/, "")}/${rel}`;
        map[`/${rel}`] = cdn; // stored shape, e.g. /2025/01/foo.jpg
        map[rel] = cdn; // bare variant, just in case
        if (++done % 50 === 0 || done === files.length) {
            console.log(`uploaded ${String(done).padStart(6)} / ${files.length}`);
        }
    }

    const queue = [...files];
    const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length) {
            const f = queue.pop()!;
            try {
                await upload(f);
            } catch (err) {
                console.error(`FAILED ${f}:`, (err as Error).message);
            }
        }
    });
    await Promise.all(workers);

    await mkdir(path.resolve("_dump"), { recursive: true });
    await writeFile(path.resolve("_dump", "image-map.json"), JSON.stringify(map));
    console.log(`\nWrote _dump/image-map.json (${Object.keys(map).length} keys, ${files.length} files).`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});