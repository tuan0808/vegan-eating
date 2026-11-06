// Seeds the LOCAL database with a demo Instagram post history so the home-page
// SocialCarousel renders with real content on localhost — the live IG token is
// dead (Meta checkpoint) and can't be used here. Posts point at vegan food
// images already in /public, so the strip looks real and works fully offline.
//
//   npx tsx scripts/seed-ig-demo.ts          # seed
//   npx tsx scripts/seed-ig-demo.ts --clear  # remove the demo cache
//
// DEV ONLY. Writes the `ig.posts_cache` Setting key, which src/lib/instagram.ts
// serves as the "last good posts" fallback when a live fetch fails.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const K_POSTS = "ig.posts_cache";

type Shot = { img: string; caption: string; video?: boolean };

// (image under /public, caption) — real dishes so the demo reads as our feed.
const SHOTS: Shot[] = [
    { img: "/2025/12/HEALTHY-XMAS-PLATTERS_03-1024x652.jpg", caption: "Holiday grazing boards, fully plant-based 🎄 Save this for the festive table!" },
    { img: "/2025/12/Vegan-Chocolate-Orange-Mousse-3-1024x683.jpg", caption: "Silky chocolate-orange mousse — 5 ingredients, no dairy ✨", video: true },
    { img: "/2025/12/cake-1024x672.jpg", caption: "A slice of something special. Vegan layer cake done right 🍰" },
    { img: "/2025/12/vegancookies-1024x683.jpg", caption: "Warm from the oven: chewy vegan cookies 🍪" },
    { img: "/2025/12/nobake-1024x576.jpg", caption: "No-bake, no stress. Dessert in minutes." },
    { img: "/2025/12/vegan-apple-crisp-0295-d112370_horiz-8f07d35f76c5490ea38ba4860d821c86-1024x683.jpg", caption: "Cozy apple crisp season is officially open 🍎" },
    { img: "/2025/01/Vegan-Paneer-Vegetable-Curry-1024x683.jpg", caption: "Tofu 'paneer' veggie curry — weeknight comfort in a bowl 🍛" },
    { img: "/2025/01/Vegan-Spicy-Pad-Kee-Mao-1024x683.jpg", caption: "Drunken noodles that bite back 🌶️ Pad kee mao, vegan style", video: true },
    { img: "/2025/01/Crispy-Kale-Chips-1536x768.jpg", caption: "The snack that disappears first: crispy kale chips 🥬" },
    { img: "/2025/01/Vegan-Broccoli-Crouton-Soup-1024x683.jpg", caption: "Creamy broccoli soup with garlicky croutons 🥦" },
    { img: "/2025/01/Split-Pea-and-Spinach-Dal-1024x683.jpg", caption: "A pot of golden split-pea & spinach dal 🫕" },
    { img: "/2025/01/Vegan-Lentil-Sloppy-Joe-Sandwich-1024x683.jpg", caption: "Messy in the best way — lentil sloppy joes 🥪" },
    { img: "/2025/01/Tuscan-Bean-Vegetable-Soup-1024x683.jpg", caption: "Tuscan bean & veg soup — one pot, big flavour 🍲" },
    { img: "/2025/12/nobake2-1024x643.png", caption: "Round two of no-bake bliss. You asked, we delivered 🙌" },
    { img: "/2025/12/Vegan-Chocolate-Orange-Mousse-3-1-1024x683.jpg", caption: "That first spoonful though 🥄 Chocolate-orange, every time." },
    { img: "/2025/10/vegan-eating-blog.jpg", caption: "New on the blog this week — tap the link in bio 💚" },
];

// Fixed base time so repeated seeds are deterministic (no Date.now()).
const BASE = Date.parse("2026-10-28T12:00:00.000Z");
const DAY = 86_400_000;

function buildPosts() {
    return SHOTS.map((s, i) => ({
        id: `demo-${i + 1}`,
        permalink: "https://instagram.com/VeganEating_Com",
        imageUrl: s.img,
        caption: s.caption,
        isVideo: Boolean(s.video),
        timestamp: new Date(BASE - i * DAY).toISOString(),
    }));
}

async function main() {
    const clear = process.argv.includes("--clear");
    if (clear) {
        await prisma.setting.deleteMany({ where: { key: K_POSTS } });
        console.log(`Cleared ${K_POSTS}.`);
        return;
    }
    const posts = buildPosts();
    const value = JSON.stringify(posts);
    await prisma.setting.upsert({
        where: { key: K_POSTS },
        update: { value },
        create: { key: K_POSTS, value },
    });
    console.log(`Seeded ${posts.length} demo IG posts into ${K_POSTS}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
