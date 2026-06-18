// scripts/migrate-to-postgres.ts
// One-shot data migration: OLD sqlite dev.db  ->  Postgres (per .env DATABASE_URL).
// Run AFTER `npm run db:push` has created the empty Postgres tables.
//
// Setup + run:
//   npx prisma generate --schema prisma/sqlite.prisma   # builds the read-only sqlite client
//   npx tsx scripts/migrate-to-postgres.ts
//
// Idempotent-ish: every insert uses skipDuplicates, so a re-run won't double up.
// To skip a table (e.g. start fresh on accounts), comment out its block.

import { PrismaClient as Postgres } from "@prisma/client";
import { PrismaClient as Sqlite } from "../prisma/generated/sqlite";

const pg = new Postgres();   // -> DATABASE_URL (Postgres)
const lite = new Sqlite();   // -> prisma/dev.db (hardcoded in sqlite.prisma)

// cross-client structural types are identical; tsx doesn't type-check, the cast
// just keeps editors quiet.
const rows = (x: unknown) => x as any;

async function main() {
    console.log("Migrating sqlite dev.db -> Postgres\n");

    // ---- parents before children (FK order) ----

    const users = await lite.user.findMany();
    if (users.length) await pg.user.createMany({ data: rows(users), skipDuplicates: true });
    console.log(`User                    ${users.length}`);

    const categories = await lite.category.findMany();
    if (categories.length) await pg.category.createMany({ data: rows(categories), skipDuplicates: true });
    console.log(`Category                ${categories.length}`);

    const forums = await lite.forum.findMany();
    if (forums.length) await pg.forum.createMany({ data: rows(forums), skipDuplicates: true });
    console.log(`Forum                   ${forums.length}`);

    const threads = await lite.thread.findMany();
    if (threads.length) await pg.thread.createMany({ data: rows(threads), skipDuplicates: true });
    console.log(`Thread                  ${threads.length}`);

    const posts = await lite.post.findMany();
    if (posts.length) await pg.post.createMany({ data: rows(posts), skipDuplicates: true });
    console.log(`Post                    ${posts.length}`);

    const recipes = await lite.recipe.findMany();
    if (recipes.length) await pg.recipe.createMany({ data: rows(recipes), skipDuplicates: true });
    console.log(`Recipe                  ${recipes.length}`);

    // Article has an Int autoincrement id — preserve ids now, reset the sequence below.
    const articles = await lite.article.findMany();
    if (articles.length) await pg.article.createMany({ data: rows(articles), skipDuplicates: true });
    console.log(`Article                 ${articles.length}`);

    // Comments are self-referential via parentId. Insert oldest-first so a parent
    // always exists before any reply that points at it.
    const comments = await lite.comment.findMany({ orderBy: { createdAt: "asc" } });
    let commentOk = 0;
    for (const c of comments) {
        try {
            await pg.comment.create({ data: rows(c) });
            commentOk++;
        } catch {
            // duplicate on re-run, or an orphaned parent — skip quietly
        }
    }
    console.log(`Comment                 ${commentOk}/${comments.length}`);

    const tokens = await lite.emailVerificationToken.findMany();
    if (tokens.length) await pg.emailVerificationToken.createMany({ data: rows(tokens), skipDuplicates: true });
    console.log(`EmailVerificationToken  ${tokens.length}`);

    const views = await lite.itemView.findMany();
    if (views.length) await pg.itemView.createMany({ data: rows(views), skipDuplicates: true });
    console.log(`ItemView                ${views.length}`);

    const subs = await lite.recipeSubmission.findMany();
    if (subs.length) await pg.recipeSubmission.createMany({ data: rows(subs), skipDuplicates: true });
    console.log(`RecipeSubmission        ${subs.length}`);

    const ips = await lite.blockedIp.findMany();
    if (ips.length) await pg.blockedIp.createMany({ data: rows(ips), skipDuplicates: true });
    console.log(`BlockedIp               ${ips.length}`);

    // Settings — your maintenance_* keys live here (the ones getSetting reads).
    const settings = await lite.setting.findMany();
    if (settings.length) await pg.setting.createMany({ data: rows(settings), skipDuplicates: true });
    console.log(`Setting                 ${settings.length}`);

    // Reset the Article id sequence so the next auto-id doesn't collide with the
    // ids we just inserted explicitly.
    if (articles.length) {
        await pg.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"Article"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Article"));`
        );
        console.log(`\nArticle id sequence reset.`);
    }

    console.log("\nDone.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await pg.$disconnect();
        await lite.$disconnect();
    });