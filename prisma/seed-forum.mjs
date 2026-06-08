// prisma/seed-forum.mjs
// Seeds the forum taxonomy (idempotent — safe to re-run) plus a system admin
// user and one welcome thread so the index shows real counts.
// Run with:  node prisma/seed-forum.mjs
// (or add an npm script:  "db:seed:forum": "node prisma/seed-forum.mjs")

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The structure exactly as you laid it out. Order here = display order.
const TAXONOMY = [
  {
    name: "General",
    slug: "general",
    description: "Site-wide chat, announcements, and anything that doesn't fit elsewhere.",
    forums: [
      { name: "News", slug: "news", description: "Announcements and updates from the team." },
      { name: "Introductions", slug: "introductions", description: "New here? Say hello." },
      { name: "Discussions", slug: "discussions", description: "Open conversation about all things food and plant-based living." },
      { name: "Suggestions", slug: "suggestions", description: "Ideas for the site, recipes, and the community." },
    ],
  },
  {
    name: "Vegan",
    slug: "vegan",
    description: "For the fully plant-based crowd.",
    forums: [
      { name: "General", slug: "general", description: "General vegan discussion." },
      { name: "Recipes", slug: "recipes", description: "Share and request vegan recipes." },
      { name: "Guides", slug: "guides", description: "How-tos, swaps, and getting-started guides." },
    ],
  },
  {
    name: "Vegetarians",
    slug: "vegetarians",
    description: "For the vegetarian community.",
    forums: [
      { name: "General", slug: "general", description: "General vegetarian discussion." },
      { name: "Recipes", slug: "recipes", description: "Share and request vegetarian recipes." },
      { name: "Guides", slug: "guides", description: "How-tos, swaps, and getting-started guides." },
    ],
  },
  {
    name: "Around the World",
    slug: "around-the-world",
    description: "Plant-based eating across cultures and borders.",
    forums: [
      { name: "Places to go", slug: "places-to-go", description: "Restaurant finds, travel tips, and veg-friendly destinations." },
    ],
  },
  {
    name: "Help",
    slug: "help",
    description: "Rules, support, and applications.",
    forums: [
      { name: "Rules", slug: "rules", description: "Community rules — please read before posting." },
      { name: "Help", slug: "help", description: "Questions about using the site." },
      { name: "Applications", slug: "applications", description: "Apply for contributor or moderator roles." },
    ],
  },
];

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  // System / admin user — author of the welcome thread, placeholder until real auth.
  const admin = await prisma.user.upsert({
    where: { email: "team@veganeating.com" },
    update: {},
    create: {
      email: "team@veganeating.com",
      username: "team",
      name: "Vegan Eating Team",
      role: "ADMIN",
    },
  });

  let catPos = 0;
  for (const cat of TAXONOMY) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, position: catPos },
      create: { name: cat.name, slug: cat.slug, description: cat.description, position: catPos },
    });
    catPos += 1;

    let forumPos = 0;
    for (const f of cat.forums) {
      await prisma.forum.upsert({
        // composite unique key: categoryId + slug
        where: { categoryId_slug: { categoryId: category.id, slug: f.slug } },
        update: { name: f.name, description: f.description, position: forumPos },
        create: {
          categoryId: category.id,
          name: f.name,
          slug: f.slug,
          description: f.description,
          position: forumPos,
        },
      });
      forumPos += 1;
    }
  }

  // One welcome thread in General → News so the board isn't empty.
  const news = await prisma.forum.findFirst({
    where: { slug: "news", category: { slug: "general" } },
  });
  if (news) {
    const welcomeSlug = "welcome-to-the-forums";
    await prisma.thread.upsert({
      where: { slug: welcomeSlug },
      update: { tag: "Announcement" },
      create: {
        forumId: news.id,
        authorId: admin.id,
        title: "Welcome to the forums",
        slug: welcomeSlug,
        tag: "Announcement",
        pinned: true,
        posts: {
          create: {
            authorId: admin.id,
            body:
              "Welcome! This is the start of our community space. Introduce yourself in Introductions, " +
              "swap recipes, and check the Rules before posting. More to come.",
          },
        },
      },
    });
  }

  const cats = await prisma.category.count();
  const forums = await prisma.forum.count();
  console.log(`Seeded forum taxonomy: ${cats} categories, ${forums} forums.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
