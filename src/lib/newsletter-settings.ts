// src/lib/newsletter-settings.ts
// Newsletter + welcome-email config, stored in the Setting KV table (no schema
// migration). Also holds the unsubscribe suppression list.
import { prisma } from "./prisma";

const K_SUBJECT = "newsletter.subject";
const K_HTML = "newsletter.html";
const K_SUPPRESSED = "newsletter.unsubscribed";
const K_WELCOME = "welcome.config";

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
