// Seeds the LOCAL database with placeholder vendor promo codes so the nav
// "Forum" dropdown renders with real-looking content on localhost. Prominent
// vendors show in the nav (with codes for logged-in members); the rest live in
// the Vendor Deals forum board.
//
//   npx tsx scripts/seed-vendors-demo.ts          # seed
//   npx tsx scripts/seed-vendors-demo.ts --clear  # remove the demo config
//
// DEV ONLY. Writes the `vendors.config` Setting key (see src/lib/vendor-config.ts).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const KEY = "vendors.config";

type Vendor = { id: string; name: string; url?: string; code: string; blurb?: string; prominent: boolean };

const VENDORS: Vendor[] = [
    { id: "v-nutsdotcom", name: "Nuts.com", url: "https://nuts.com", code: "VEGAN15", blurb: "15% off your first order", prominent: true },
    { id: "v-thrivemarket", name: "Thrive Market", url: "https://thrivemarket.com", code: "PLANTS40", blurb: "40% off + free gift for new members", prominent: true },
    { id: "v-oatly", name: "Oatly", url: "https://oatly.com", code: "OATLY10", blurb: "10% off the whole barista range", prominent: true },
    { id: "v-beyond", name: "Beyond Meat", url: "https://beyondmeat.com", code: "BEYOND20", blurb: "20% off your next cookout box", prominent: true },
    { id: "v-miyokos", name: "Miyoko's Creamery", url: "https://miyokos.com", code: "CHEESE25", blurb: "25% off cultured vegan butter & cheese", prominent: true },
    { id: "v-vejap", name: "Vej Provisions", url: "https://example.com", code: "WELCOME5", blurb: "$5 off orders over $35", prominent: true },
    // Non-prominent: these stay in the Vendor Deals forum, not the nav.
    { id: "v-localtofu", name: "Local Tofu Co.", url: "", code: "TOFU10", blurb: "10% off at the farmers market stand", prominent: false },
    { id: "v-sprout", name: "Sprout Snacks", url: "https://example.com", code: "SNACK3", blurb: "Buy 2 get 1 free", prominent: false },
];

async function main() {
    if (process.argv.includes("--clear")) {
        await prisma.setting.deleteMany({ where: { key: KEY } });
        console.log(`Cleared ${KEY}.`);
        return;
    }
    const value = JSON.stringify({
        vendors: VENDORS,
        dealsHref: "/forum",
        updatedAt: new Date().toISOString(),
        updatedBy: "seed-vendors-demo",
    });
    await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
    const prominent = VENDORS.filter((v) => v.prominent).length;
    console.log(`Seeded ${VENDORS.length} demo vendors (${prominent} prominent) into ${KEY}.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
