// src/lib/newsletter-settings.ts
// Newsletter + welcome-email config, stored in the Setting KV table (no schema
// migration). Also holds the unsubscribe suppression list.
import { prisma } from "./prisma";

const K_SUBJECT = "newsletter.subject";
const K_HTML = "newsletter.html";
const K_SUPPRESSED = "newsletter.unsubscribed";
const K_WELCOME = "welcome.config";
const K_WELCOME_SUBJECT = "welcome.subject";
const K_WELCOME_HTML = "welcome.html";

export const DEFAULT_NEWSLETTER_HTML = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2a2a24;padding:8px">
  <h1 style="color:#225f27;font-size:24px;margin:0 0 8px">From the vegan eating kitchen</h1>
  <p style="line-height:1.6;font-size:15.5px">Hi there,</p>
  <p style="line-height:1.6;font-size:15.5px">Write your update here. You can paste raw HTML, embed images with
    &lt;img src="https://..."&gt;, add buttons, and style anything inline.</p>
  <p style="margin:24px 0">
    <a href="https://veganeating.com/recipes" style="background:#5b6b3f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block">This week's recipes</a>
  </p>
  <p style="line-height:1.6;font-size:15px;color:#5f6a57">Happy cooking,<br>The vegan eating kitchen</p>
</div>`;

export async function getNewsletter(): Promise<{ subject: string; html: string }> {
    const rows = await prisma.setting.findMany({ where: { key: { in: [K_SUBJECT, K_HTML] } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
        subject: map[K_SUBJECT] ?? "From the vegan eating kitchen",
        html: map[K_HTML] ?? DEFAULT_NEWSLETTER_HTML,
    };
}

export async function saveNewsletter(subject: string, html: string): Promise<void> {
    await prisma.setting.upsert({ where: { key: K_SUBJECT }, update: { value: subject }, create: { key: K_SUBJECT, value: subject } });
    await prisma.setting.upsert({ where: { key: K_HTML }, update: { value: html }, create: { key: K_HTML, value: html } });
}

// --- welcome email content (editable; {{name}} is replaced per recipient) ----
export const DEFAULT_WELCOME_SUBJECT = "Welcome to vegan eating 🌱";
export const DEFAULT_WELCOME_HTML = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2a2a24;padding:8px">
  <h1 style="font-size:24px;margin:0 0 6px;color:#225f27">You're in — welcome to vegan eating! 🌱</h1>
  <p style="line-height:1.6;font-size:15.5px">Hi {{name}},</p>
  <p style="line-height:1.6;font-size:15.5px">Thanks for verifying your email and joining <strong>veganeating.com</strong>. You now have a home for tested plant-based recipes, a friendly community, and a few clever kitchen tools. Here's where to start:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px">
    <tr><td style="padding:0 0 14px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e2d6;border-radius:14px"><tr><td style="padding:16px 18px">
      <div style="font-weight:700;font-size:15px;color:#20271c;margin-bottom:4px">Browse the recipes</div>
      <div style="font-size:14px;line-height:1.5;color:#5f6a57;margin-bottom:10px">Hundreds of tested vegan recipes — and Cook Mode keeps the steps hands-free while you cook.</div>
      <a href="https://veganeating.com/recipes" style="font-size:13.5px;font-weight:600;color:#2f7d38;text-decoration:none">Explore recipes &rarr;</a>
    </td></tr></table></td></tr>
    <tr><td style="padding:0 0 14px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e2d6;border-radius:14px"><tr><td style="padding:16px 18px">
      <div style="font-weight:700;font-size:15px;color:#20271c;margin-bottom:4px">Veganize any recipe</div>
      <div style="font-size:14px;line-height:1.5;color:#5f6a57;margin-bottom:10px">Paste any recipe into our AI generator and get a plant-based version in seconds.</div>
      <a href="https://veganeating.com/tools/veganize" style="font-size:13.5px;font-weight:600;color:#2f7d38;text-decoration:none">Try the Veganizer &rarr;</a>
    </td></tr></table></td></tr>
    <tr><td style="padding:0 0 14px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e2d6;border-radius:14px"><tr><td style="padding:16px 18px">
      <div style="font-weight:700;font-size:15px;color:#20271c;margin-bottom:4px">Substitution glossary</div>
      <div style="font-size:14px;line-height:1.5;color:#5f6a57;margin-bottom:10px">Out of an ingredient? Search our swap glossary for what to use instead.</div>
      <a href="https://veganeating.com/substitutions" style="font-size:13.5px;font-weight:600;color:#2f7d38;text-decoration:none">Find a swap &rarr;</a>
    </td></tr></table></td></tr>
  </table>
  <div style="background:#f1efe6;border-radius:14px;padding:16px 18px;margin:14px 0">
    <div style="font-weight:700;font-size:15px;color:#20271c;margin-bottom:4px">One quick step to post in the forums</div>
    <div style="font-size:14px;line-height:1.55;color:#5f6a57">To keep the community kind and useful, posting is unlocked after you read the house rules once. Pop over to
      <a href="https://veganeating.com/forum/general/news" style="color:#2f7d38;font-weight:600;text-decoration:none">the rules thread</a> and give it a read — that's it, you'll be able to post.</div>
  </div>
  <p style="line-height:1.6;font-size:15px;color:#5f6a57;margin-top:18px">Happy cooking,<br>The vegan eating kitchen</p>
</div>`;

export async function getWelcomeEmail(): Promise<{ subject: string; html: string }> {
    const rows = await prisma.setting.findMany({ where: { key: { in: [K_WELCOME_SUBJECT, K_WELCOME_HTML] } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
        subject: map[K_WELCOME_SUBJECT] ?? DEFAULT_WELCOME_SUBJECT,
        html: map[K_WELCOME_HTML] ?? DEFAULT_WELCOME_HTML,
    };
}

export async function saveWelcomeEmail(subject: string, html: string): Promise<void> {
    await prisma.setting.upsert({ where: { key: K_WELCOME_SUBJECT }, update: { value: subject }, create: { key: K_WELCOME_SUBJECT, value: subject } });
    await prisma.setting.upsert({ where: { key: K_WELCOME_HTML }, update: { value: html }, create: { key: K_WELCOME_HTML, value: html } });
}

export type WelcomeConfig = { enabled: boolean; testMode: boolean };

export async function getWelcomeConfig(): Promise<WelcomeConfig> {
    const row = await prisma.setting.findUnique({ where: { key: K_WELCOME } });
    // Default: ON but in TEST mode, so real users are never emailed until an
    // admin has previewed it and turned test mode off.
    if (!row?.value) return { enabled: true, testMode: true };
    try {
        const v = JSON.parse(row.value);
        return { enabled: !!v.enabled, testMode: !!v.testMode };
    } catch {
        return { enabled: true, testMode: true };
    }
}

export async function saveWelcomeConfig(c: WelcomeConfig): Promise<void> {
    const value = JSON.stringify({ enabled: !!c.enabled, testMode: !!c.testMode });
    await prisma.setting.upsert({ where: { key: K_WELCOME }, update: { value }, create: { key: K_WELCOME, value } });
}

export async function getSuppressed(): Promise<Set<string>> {
    const row = await prisma.setting.findUnique({ where: { key: K_SUPPRESSED } });
    if (!row?.value) return new Set();
    try {
        const v = JSON.parse(row.value);
        return new Set(Array.isArray(v) ? v.map((e: string) => String(e).toLowerCase()) : []);
    } catch {
        return new Set();
    }
}

export async function addSuppressed(email: string): Promise<void> {
    const set = await getSuppressed();
    set.add(email.trim().toLowerCase());
    const value = JSON.stringify(Array.from(set));
    await prisma.setting.upsert({ where: { key: K_SUPPRESSED }, update: { value }, create: { key: K_SUPPRESSED, value } });
}
