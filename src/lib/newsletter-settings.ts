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
export const DEFAULT_WELCOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Welcome to vegan eating</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { -ms-interpolation-mode: bicubic; border: 0; }
    body { margin: 0; padding: 0; width: 100% !important; }
    @media only screen and (max-width: 600px) {
      .wrap { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .h1 { font-size: 36px !important; line-height: 40px !important; }
      .stack { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
      .gap { display: none !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F4F3EA;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F3EA" style="background-color:#F4F3EA;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#fffdf7; border-radius:18px; overflow:hidden;">

        <tr><td height="6" bgcolor="#2F7D38" style="height:6px; line-height:6px; font-size:6px; background-color:#2F7D38;">&nbsp;</td></tr>

        <tr><td class="px" align="center" style="padding:28px 48px 4px 48px;">
          <img src="https://veganeating-media.nyc3.cdn.digitaloceanspaces.com/brand/logo-dark.png" alt="vegan eating" width="190" style="display:block; width:190px; max-width:60%; height:auto;">
        </td></tr>

        <tr><td class="px" align="center" style="padding:22px 48px 0 48px;">
          <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#E15A22;">Welcome to the table</div>
          <h1 class="h1" style="margin:14px 0 0 0; font-family:'Fraunces',Georgia,serif; font-size:42px; line-height:46px; font-weight:600; color:#1c2317; letter-spacing:-0.5px;">You're in,<br>{{name}}.</h1>
        </td></tr>

        <tr><td class="px" align="center" style="padding:16px 56px 0 56px;">
          <p style="margin:0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:17px; line-height:27px; color:#454b3e;">No ads, no twelve-paragraph life story before the recipe. Just tested plant-based cooking and a community that actually cooks.</p>
        </td></tr>

        <!-- Browse tested recipes -->
        <tr><td class="px" style="padding:34px 48px 0 48px;">
          <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#2F7D38;">Browse tested recipes</div>
          <p style="margin:8px 0 16px 0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#6b6f63;">Over a thousand of them. Every one cooked before it earned a spot — start with a couple of our collections:</p>
          {{category_cards}}
        </td></tr>

        <!-- Fresh from the forum (latest thread) -->
        <tr><td class="px" style="padding:30px 48px 0 48px;">
          {{latest_thread}}
        </td></tr>

        <!-- Veganizer -->
        <tr><td class="px" style="padding:24px 48px 0 48px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#C24817" style="background-color:#C24817; background-image:linear-gradient(135deg,#F0883E,#B23E26); border-radius:16px;"><tr>
            <td style="padding:28px 28px;">
              <div style="font-size:34px; line-height:1;">🪄</div>
              <div style="font-family:'Fraunces',Georgia,serif; font-size:26px; font-weight:600; color:#ffffff; padding-top:10px; line-height:1.1;">Veganize anything</div>
              <p style="margin:8px 0 0 0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#ffe9dd;">Paste any recipe — or just tell it what's in your fridge — and watch it turn plant-based in seconds. It's a little bit magic.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr>
                <td bgcolor="#ffffff" style="border-radius:999px;">
                  <a href="https://veganeating.com/tools/veganize" target="_blank" style="display:inline-block; padding:13px 28px; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#C24817; text-decoration:none; border-radius:999px;">Open the Veganizer →</a>
                </td>
              </tr></table>
            </td>
          </tr></table>
        </td></tr>

        <!-- Posting note -->
        <tr><td class="px" style="padding:26px 48px 0 48px;">
          <p style="margin:0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:14px; line-height:22px; color:#6b6f63;">Want to post in the forums? Read the house rules once at <a href="https://veganeating.com/forum/general/news" style="color:#2F7D38; font-weight:600; text-decoration:none;">the rules thread</a> and posting unlocks. That's it.</p>
        </td></tr>

        <tr><td class="px" style="padding:30px 48px 0 48px;">
          <p style="margin:0; font-family:'Fraunces',Georgia,serif; font-style:italic; font-size:19px; line-height:28px; color:#225F27;">Glad you're here. Now go get something on the stove.</p>
          <p style="margin:8px 0 0 0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:15px; color:#6b6f63;">— The vegan eating crew</p>
        </td></tr>

        <tr><td height="30" style="height:30px; line-height:30px; font-size:30px;">&nbsp;</td></tr>

        <tr><td bgcolor="#225F27" style="background-color:#225F27; padding:26px 48px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:'Fraunces',Georgia,serif; font-style:italic; font-size:18px; color:#f0efe4;">Eat green, feel green. 🌱</td></tr>
            <tr><td align="center" style="padding-top:14px; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:12px; line-height:20px; color:#b9c9b3;">
              veganeating.com<br>You're getting this because you created an account.
              <a href="{{unsubscribe_url}}" style="color:#e7e5d8; text-decoration:underline;">Unsubscribe</a>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
