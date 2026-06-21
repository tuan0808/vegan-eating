// scripts/build-subs.ts
//
// Populate the IngredientSub table.
//   npx tsx scripts/build-subs.ts --dry     # print the canonical list, write nothing
//   npx tsx scripts/build-subs.ts           # seed staples + fill missing via OpenAI
//   npx tsx scripts/build-subs.ts --force   # also re-fill rows that already exist
//
// Runtime never calls OpenAI — only this script does. Re-run it whenever you
// add recipes with new ingredients.

import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { canonicalName, type Sub } from "../src/lib/subs";

const prisma = new PrismaClient();
const openai = new OpenAI();

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");
const MODEL = process.env.OPENAI_SUBS_MODEL || "gpt-4o-mini";
const BATCH = 25;

type SeedRow = { aliases: string[]; vegan: boolean; subs: Sub[] };

// Hand-written so the staples are always correct; these skip OpenAI entirely.
const SEED: Record<string, SeedRow> = {
    egg: { vegan: false, aliases: ["eggs", "large egg", "whole egg"], subs: [
            { name: "flax egg", note: "1 tbsp flax + 3 tbsp water" },
            { name: "chia egg", note: "1 tbsp chia + 3 tbsp water" },
            { name: "applesauce", note: "¼ cup per egg, in baking" },
            { name: "aquafaba", note: "3 tbsp per egg" },
        ] },
    butter: { vegan: false, aliases: ["unsalted butter", "salted butter"], subs: [
            { name: "vegan butter", note: "1:1" },
            { name: "coconut oil", note: "1:1, solid" },
            { name: "olive oil", note: "¾ amount for savoury" },
        ] },
    milk: { vegan: false, aliases: ["whole milk", "dairy milk"], subs: [
            { name: "soy milk", note: "1:1, neutral" },
            { name: "oat milk", note: "1:1, creamy" },
            { name: "almond milk", note: "1:1, lighter" },
        ] },
    honey: { vegan: false, aliases: ["raw honey"], subs: [
            { name: "maple syrup", note: "1:1" },
            { name: "agave nectar", note: "1:1, milder" },
            { name: "date syrup", note: "1:1, richer" },
        ] },
    gelatin: { vegan: false, aliases: ["gelatine"], subs: [
            { name: "agar agar", note: "use ⅓ the amount" },
            { name: "carrageenan" },
        ] },
    cream: { vegan: false, aliases: ["heavy cream", "double cream"], subs: [
            { name: "coconut cream", note: "1:1, chilled" },
            { name: "cashew cream", note: "blend soaked cashews" },
        ] },
    "sour cream": { vegan: false, aliases: [], subs: [
            { name: "cashew sour cream" },
            { name: "coconut yogurt", note: "+ lemon juice" },
        ] },
    yogurt: { vegan: false, aliases: ["greek yogurt", "plain yogurt"], subs: [
            { name: "coconut yogurt", note: "1:1" },
            { name: "soy yogurt", note: "1:1, higher protein" },
        ] },
    cheese: { vegan: false, aliases: ["cheddar", "mozzarella"], subs: [
            { name: "vegan cheese", note: "1:1" },
            { name: "nutritional yeast", note: "for cheesy flavour" },
        ] },
    parmesan: { vegan: false, aliases: ["parmigiano"], subs: [
            { name: "nutritional yeast" },
            { name: "vegan parmesan", note: "cashew + nooch blend" },
        ] },
    "fish sauce": { vegan: false, aliases: [], subs: [
            { name: "soy sauce", note: "+ pinch of seaweed" },
            { name: "vegan fish sauce" },
        ] },
    "worcestershire sauce": { vegan: false, aliases: [], subs: [
            { name: "vegan worcestershire" },
            { name: "soy sauce", note: "+ splash of vinegar" },
        ] },
    mayonnaise: { vegan: false, aliases: ["mayo"], subs: [
            { name: "vegan mayo", note: "1:1" },
            { name: "aquafaba mayo" },
        ] },
    buttermilk: { vegan: false, aliases: [], subs: [
            { name: "plant milk + acid", note: "1 cup + 1 tbsp lemon" },
        ] },
};

function dbHost(): string {
    try { return new URL(process.env.DATABASE_URL || "").host || "(unknown)"; }
    catch { return "(unparseable DATABASE_URL)"; }
}

async function fillBatch(names: string[]): Promise<Record<string, SeedRow>> {
    const sys =
        "You are a culinary assistant for a VEGAN recipe site. For each ingredient, give 2-4 practical, " +
        "widely-available substitutions suitable for vegan cooking. Every substitute MUST itself be vegan. " +
        "Prefer swaps that help with allergies (nut-free, gluten-free, soy-free) or pantry availability. " +
        "Add a short note with ratio or flavour where useful (max 8 words; omit if obvious). Also give common aliases. " +
        "If the ingredient itself is not vegan, set vegan=false and make the subs its vegan replacements. " +
        'Respond ONLY with a JSON object keyed by the EXACT ingredient strings provided, each value ' +
        '{ "aliases": string[], "vegan": boolean, "subs": [{ "name": string, "note"?: string }] }. No prose.';

    const res = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify({ ingredients: names }) },
        ],
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const out: Record<string, SeedRow> = {};
    for (const name of names) {
        const v = parsed[name];
        if (!v || !Array.isArray(v.subs)) continue;
        const subs: Sub[] = v.subs
            .filter((s: unknown) => s && typeof (s as Sub).name === "string")
            .map((s: Sub) => ({ name: s.name.trim(), ...(s.note ? { note: String(s.note).trim() } : {}) }))
            .slice(0, 4);
        if (subs.length === 0) continue;
        out[name] = {
            aliases: Array.isArray(v.aliases) ? v.aliases.map(String) : [],
            vegan: v.vegan === false ? false : true,
            subs,
        };
    }
    return out;
}

async function upsert(name: string, row: SeedRow) {
    const data = {
        aliases: JSON.stringify(row.aliases),
        subs: JSON.stringify(row.subs),
        vegan: row.vegan,
    };
    await prisma.ingredientSub.upsert({
        where: { name },
        create: { name, ...data },
        update: data,
    });
}

async function main() {
    console.log(`\n• Target database: ${dbHost()}`);
    console.log(`• Model: ${MODEL}   Mode: ${DRY ? "DRY RUN" : FORCE ? "FILL + FORCE REFILL" : "FILL MISSING"}\n`);

    // 1) canonical, de-duplicated ingredient list across all recipes
    const recipes = await prisma.recipe.findMany({ select: { ingredients: true } });
    const master = new Set<string>();
    for (const r of recipes) {
        let lines: string[] = [];
        try { const v = JSON.parse(r.ingredients || "[]"); if (Array.isArray(v)) lines = v.map(String); } catch { /* skip */ }
        for (const line of lines) {
            const key = canonicalName(line);
            if (key) master.add(key);
        }
    }

    // seed keys are authoritative — fold them through canonicalName so they line up with the matcher
    const seedByKey = new Map<string, SeedRow>();
    for (const [k, v] of Object.entries(SEED)) seedByKey.set(canonicalName(k) || k, v);
    for (const k of Array.from(seedByKey.keys())) master.add(k);

    const all = Array.from(master).sort();
    console.log(`Found ${all.length} canonical ingredients (${seedByKey.size} seeded staples).`);

    if (DRY) {
        console.log("\n" + all.join("\n"));
        await prisma.$disconnect();
        return;
    }

    // 2) seed the staples first
    for (const [k, v] of Array.from(seedByKey)) await upsert(k, v);
    console.log(`Seeded ${seedByKey.size} staples.`);

    // 3) figure out which of the rest still need filling
    const existing = new Set(
        (await prisma.ingredientSub.findMany({ select: { name: true } })).map((x) => x.name),
    );
    const todo = all.filter((k) => !seedByKey.has(k) && (FORCE || !existing.has(k)));
    console.log(`${todo.length} ingredients to fill via OpenAI.\n`);

    // 4) batch through OpenAI, continue-on-error per batch
    let done = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
        const batch = todo.slice(i, i + BATCH);
        try {
            const filled = await fillBatch(batch);
            for (const [name, row] of Object.entries(filled)) await upsert(name, row);
            done += Object.keys(filled).length;
            console.log(`  batch ${i / BATCH + 1}: wrote ${Object.keys(filled).length}/${batch.length}`);
        } catch (e) {
            console.warn(`  batch ${i / BATCH + 1} failed, skipping:`, (e as Error).message);
        }
    }

    console.log(`\nDone. ${done} ingredients filled, plus ${seedByKey.size} staples.`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});