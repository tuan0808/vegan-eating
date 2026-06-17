// src/data/site.ts
export const nav = [
  { label: "Home", href: "/" },
  { label: "Recipes", href: "/recipes" },
  { label: "Forum", href: "/forum" },
  { label: "Submit recipe", href: "/submit" },
  { label: "Health", href: "/articles" },
];

export const stats = [
  { num: "3,400+", lab: "Recipes" },
  { num: "12,000", lab: "Members" },
  { num: "28k", lab: "Conversations" },
  { num: "47", lab: "Contributors" },
];

export const pills = ["All", "Breakfast", "Mains", "Baking", "Salads & bowls", "Desserts", "30 minutes"];

export const promise = [
  {
    title: "Every recipe tested",
    body: "Cooked and re-cooked in a real kitchen before it goes live — no AI guesswork, no untested experiments.",
    icon: "check",
  },
  {
    title: "No ads, no life story",
    body: "Straight to the recipe. No popups, no autoplay video, no 2,000-word preamble. Ever.",
    icon: "bolt",
  },
  {
    title: "A community, not a comments box",
    body: "Swap tips, share photos of your cooks, and cook along with thousands of other plant-based cooks.",
    icon: "people",
  },
];

export const collections = [
  { name: "Weeknight in 30", count: 128, ph: "p1", cat: "30-minutes" },
  { name: "Salads & bowls", count: 76, ph: "p6", cat: "salads-bowls" },
  { name: "Plant-based baking", count: 94, ph: "p3", cat: "baking" },
  { name: "Desserts", count: 52, ph: "p2", cat: "desserts" },
];

export const threads = [
  {
    avatar: "a1",
    initial: "D",
    cat: "Help & advice",
    catClass: "c-help",
    title: "My galette dough keeps cracking when I fold it — what am I doing wrong?",
    meta: "Started by Dana R. · 3 hours ago · last reply by Marcus",
    replies: 24,
  },
  {
    avatar: "a2",
    initial: "P",
    cat: "Show & tell",
    catClass: "c-show",
    title: "Made the harissa cauliflower steaks for 12 people — here's how it went 🔥",
    meta: "Started by Priya N. · yesterday · last reply by Sam",
    replies: 61,
  },
  {
    avatar: "a3",
    initial: "L",
    cat: "Substitutions",
    catClass: "c-chat",
    title: "Best dairy-free swap for ricotta that won't go watery?",
    meta: "Started by Leo T. · 2 days ago · last reply by Aisha",
    replies: 38,
  },
];

export const cooks = [
  { name: "Marcus Reyes", role: "Vegan baking", bio: "Sourdough obsessive, devout aquafaba enthusiast.", recipes: 142, avatar: "a1" },
  { name: "Priya Nair", role: "Weeknight cooking", bio: "Big-flavour plant dinners that land in under an hour.", recipes: 98, avatar: "a2" },
  { name: "Aisha Khan", role: "Wholefoods", bio: "Proving vegetables are never the side dish.", recipes: 115, avatar: "a5" },
  { name: "Leo Tanaka", role: "Desserts", bio: "If it involves dark chocolate or coconut cream, he is in.", recipes: 67, avatar: "a4" },
];