// Seeds the LOCAL database with a small forum so /forum can be demoed locally.
// The forum code is all present — it just queries Category/Forum/Thread/Post,
// which are empty in a fresh local DB (same situation as the IG strip needing
// cached posts). Threads/posts are authored by whatever users already exist
// locally, so this needs at least one user (register one, or run db:seed).
//
//   npx tsx scripts/seed-forum-demo.ts          # seed
//   npx tsx scripts/seed-forum-demo.ts --clear  # remove the demo forum
//
// DEV ONLY. Idempotent: re-running upserts the same slugs without duplicating.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ThreadSeed = { slug: string; title: string; tag?: string; posts: string[] };
type ForumSeed = { slug: string; name: string; description: string; threads: ThreadSeed[] };
type CategorySeed = { slug: string; name: string; description: string; forums: ForumSeed[] };

const CATEGORIES: CategorySeed[] = [
    {
        slug: "community",
        name: "Community",
        description: "Say hello and talk all things plant-based.",
        forums: [
            {
                slug: "introductions",
                name: "Introductions",
                description: "New here? Introduce yourself to the community.",
                threads: [
                    {
                        slug: "hello-from-a-new-vegan",
                        title: "Hello from a new vegan!",
                        tag: "Intro",
                        posts: [
                            "Hi everyone! Three weeks plant-based and loving it. Any tips for a beginner who misses cheese? 🧀➡️🌱",
                            "Welcome! Cashew-based cheeses were a game changer for me — give the chocolate-orange mousse a go too.",
                            "Welcome aboard! The broccoli crouton soup is a great cozy starter recipe.",
                        ],
                    },
                    {
                        slug: "whats-your-why",
                        title: "What's your \"why\" for going vegan?",
                        tag: "Discussion",
                        posts: [
                            "Curious what got everyone started — health, animals, environment, or a mix?",
                            "Started for the animals, stayed for how good I feel. The food is unreal these days.",
                        ],
                    },
                ],
            },
            {
                slug: "lifestyle",
                name: "Vegan Lifestyle",
                description: "Travel, eating out, and living plant-based day to day.",
                threads: [
                    {
                        slug: "best-vegan-finds-near-whole-foods",
                        title: "Best vegan finds near Whole Foods?",
                        tag: "Eating Out",
                        posts: [
                            "Dropping my favorite grab-and-go finds — what are yours?",
                            "Their house-made hummus wraps are shockingly good for a quick lunch.",
                        ],
                    },
                ],
            },
        ],
    },
    {
        slug: "recipes-cooking",
        name: "Recipes & Cooking",
        description: "Swap recipes, techniques, and kitchen wins.",
        forums: [
            {
                slug: "recipe-help",
                name: "Recipe Help",
                description: "Stuck on a recipe? Ask here.",
                threads: [
                    {
                        slug: "how-to-make-tofu-crispy",
                        title: "How do you get tofu actually crispy?",
                        tag: "Help",
                        posts: [
                            "Mine always comes out soggy. Press it? Cornstarch? Air fryer? Help!",
                            "Press 20 min, toss in cornstarch + a little oil, then air fry at 400°F. Crispy every time.",
                            "Freezing then thawing the block first also gives it a chewier, spongier texture that crisps up great.",
                        ],
                    },
                    {
                        slug: "holiday-dessert-ideas",
                        title: "Vegan holiday dessert ideas 🎄",
                        tag: "Recipes",
                        posts: [
                            "Building my holiday menu — what's your showstopper dessert?",
                            "The no-bake chocolate-orange mousse never fails. Five ingredients and everyone asks for the recipe.",
                        ],
                    },
                ],
            },
        ],
    },
];

const K_SLUGS = CATEGORIES.map((c) => c.slug);

// Deterministic timestamps (newest threads first), no Date.now().
const BASE = Date.parse("2026-10-30T15:00:00.000Z");
const HOUR = 3_600_000;

async function clear() {
    // Cascades delete forums/threads/posts under these categories.
    const res = await prisma.category.deleteMany({ where: { slug: { in: K_SLUGS } } });
    console.log(`Cleared ${res.count} demo categories (and their forums/threads/posts).`);
}

async function seed() {
    const authors = await prisma.user.findMany({ select: { id: true }, take: 5, orderBy: { createdAt: "asc" } });
    if (!authors.length) {
        throw new Error("No users in the local DB — register one (or run `npm run db:seed`) first; threads need an author.");
    }
    const authorAt = (i: number) => authors[i % authors.length].id;

    let t = 0; // global thread counter → staggered timestamps
    for (let ci = 0; ci < CATEGORIES.length; ci++) {
        const c = CATEGORIES[ci];
        const category = await prisma.category.upsert({
            where: { slug: c.slug },
            update: { name: c.name, description: c.description, position: ci },
            create: { slug: c.slug, name: c.name, description: c.description, position: ci },
        });

        for (let fi = 0; fi < c.forums.length; fi++) {
            const f = c.forums[fi];
            const forum = await prisma.forum.upsert({
                where: { categoryId_slug: { categoryId: category.id, slug: f.slug } },
                update: { name: f.name, description: f.description, position: fi },
                create: { categoryId: category.id, slug: f.slug, name: f.name, description: f.description, position: fi },
            });

            for (const th of f.threads) {
                const when = new Date(BASE - t * 6 * HOUR);
                const exists = await prisma.thread.findUnique({ where: { slug: th.slug } });
                if (!exists) {
                    await prisma.thread.create({
                        data: {
                            forumId: forum.id,
                            authorId: authorAt(t),
                            title: th.title,
                            tag: th.tag ?? null,
                            slug: th.slug,
                            createdAt: when,
                            updatedAt: when,
                            lastPostAt: new Date(when.getTime() + (th.posts.length - 1) * HOUR),
                            posts: {
                                create: th.posts.map((body, pi) => ({
                                    authorId: authorAt(t + pi),
                                    body,
                                    status: "APPROVED",
                                    createdAt: new Date(when.getTime() + pi * HOUR),
                                    updatedAt: new Date(when.getTime() + pi * HOUR),
                                })),
                            },
                        },
                    });
                }
                t++;
            }
        }
    }
    const [cats, forums, threads, posts] = await Promise.all([
        prisma.category.count({ where: { slug: { in: K_SLUGS } } }),
        prisma.forum.count(),
        prisma.thread.count(),
        prisma.post.count(),
    ]);
    console.log(`Seeded demo forum: ${cats} categories, ${forums} forums, ${threads} threads, ${posts} posts (totals).`);
}

async function main() {
    if (process.argv.includes("--clear")) await clear();
    else await seed();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
