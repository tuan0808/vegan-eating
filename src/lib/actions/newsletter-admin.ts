"use server";
// src/lib/actions/newsletter-admin.ts — admin newsletter + welcome-email controls.
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import {
    getWelcomeConfig,
    saveWelcomeConfig,
    saveWelcomeEmail,
    saveNewsletter,
    getNewsletter,
    getSuppressed,
} from "@/lib/newsletter-settings";
import { sendWelcomeEmail, sendNewsletterEmail, sendNewsletterBatch } from "@/lib/email";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export type State = { ok: boolean; message: string | null; key?: number };

async function adminEmail(): Promise<{ email: string; name: string | null } | null> {
    const me = await requireRole(["ADMIN"]);
    // Read fresh from the DB — the session token caches the OLD email after a
    // profile change until the user logs in again, so trusting me.email would
    // keep sending tests to the previous address.
    if (me.id) {
        const row = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true, name: true } });
        if (row?.email) return { email: row.email, name: row.name };
    }
    return me.email ? { email: me.email, name: me.name ?? null } : null;
}

// --- welcome email: settings + content --------------------------------------
export async function saveWelcomeAction(_prev: State, formData: FormData): Promise<State> {
    try { await requireRole(["ADMIN"]); } catch { return { ok: false, message: "Not allowed.", key: Date.now() }; }
    await saveWelcomeConfig({
        enabled: formData.get("enabled") === "on",
        testMode: formData.get("testMode") === "on",
    });
    const subject = String(formData.get("subject") ?? "").trim();
    const html = String(formData.get("html") ?? "");
    if (subject) await saveWelcomeEmail(subject, html);
    return { ok: true, message: "Welcome email saved.", key: Date.now() };
}

// Sends the CURRENT editor content (may be unsaved) to the admin.
export async function sendTestWelcomeAction(_prev: State, formData: FormData): Promise<State> {
    const admin = await adminEmail();
    if (!admin) return { ok: false, message: "No admin email found.", key: Date.now() };
    const override = {
        subject: String(formData.get("subject") ?? ""),
        html: String(formData.get("html") ?? ""),
    };
    try {
        await sendWelcomeEmail(admin.email, admin.name, override, unsubscribeUrl(admin.email));
        return { ok: true, message: `Test welcome sent to ${admin.email}.`, key: Date.now() };
    } catch (e) {
        return { ok: false, message: `Send failed: ${(e as Error).message}`, key: Date.now() };
    }
}

// --- newsletter -------------------------------------------------------------
export async function saveNewsletterAction(_prev: State, formData: FormData): Promise<State> {
    try { await requireRole(["ADMIN"]); } catch { return { ok: false, message: "Not allowed.", key: Date.now() }; }
    const subject = String(formData.get("subject") ?? "").trim();
    const html = String(formData.get("html") ?? "");
    if (!subject) return { ok: false, message: "A subject is required.", key: Date.now() };
    await saveNewsletter(subject, html);
    return { ok: true, message: "Newsletter draft saved.", key: Date.now() };
}

export async function sendTestNewsletterAction(_prev: State, formData: FormData): Promise<State> {
    const admin = await adminEmail();
    if (!admin) return { ok: false, message: "No admin email found.", key: Date.now() };
    // Test the current editor content (may be unsaved).
    const subject = String(formData.get("subject") ?? "").trim() || (await getNewsletter()).subject;
    const html = String(formData.get("html") ?? "") || (await getNewsletter()).html;
    try {
        await sendNewsletterEmail(admin.email, admin.name ?? "there", `[TEST] ${subject}`, html, unsubscribeUrl(admin.email));
        return { ok: true, message: `Test sent to ${admin.email}.`, key: Date.now() };
    } catch (e) {
        return { ok: false, message: `Send failed: ${(e as Error).message}`, key: Date.now() };
    }
}

// Pull opted-in contacts (with first names) from the Resend audience (best-effort).
async function audienceContacts(): Promise<{ email: string; name: string | null }[]> {
    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!apiKey || !audienceId) return [];
    try {
        const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: "no-store",
        });
        if (!res.ok) return [];
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : [];
        return list
            .filter((c: { unsubscribed?: boolean; email?: string }) => !c.unsubscribed && c.email)
            .map((c: { email: string; first_name?: string | null }) => ({ email: c.email.toLowerCase(), name: c.first_name ?? null }));
    } catch {
        return [];
    }
}

/** The deduped recipient set with names: verified users ∪ subscribers − suppressed. */
async function recipients(): Promise<{ email: string; name: string | null }[]> {
    const [users, subs, suppressed] = await Promise.all([
        prisma.user.findMany({ where: { emailVerified: { not: null } }, select: { email: true, name: true } }),
        audienceContacts(),
        getSuppressed(),
    ]);
    const map = new Map<string, string | null>();
    for (const u of users) if (u.email) map.set(u.email.toLowerCase(), u.name ?? null);
    for (const c of subs) if (!map.has(c.email)) map.set(c.email, c.name);
    for (const s of suppressed) map.delete(s);
    return Array.from(map, ([email, name]) => ({ email, name }));
}

/** Read-only count for the UI (so the admin sees the reach before sending). */
export async function recipientCount(): Promise<number> {
    await requireRole(["ADMIN"]);
    return (await recipients()).length;
}

export async function sendNewsletterToAllAction(_prev: State, formData: FormData): Promise<State> {
    try { await requireRole(["ADMIN"]); } catch { return { ok: false, message: "Not allowed.", key: Date.now() }; }
    if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "SEND") {
        return { ok: false, message: 'Type SEND to confirm the broadcast.', key: Date.now() };
    }
    const subject = String(formData.get("subject") ?? "").trim();
    const html = String(formData.get("html") ?? "");
    if (!subject) return { ok: false, message: "A subject is required.", key: Date.now() };

    // Persist what's being sent, then blast.
    await saveNewsletter(subject, html);
    const list = await recipients();
    if (list.length === 0) return { ok: false, message: "No recipients found.", key: Date.now() };

    try {
        const items = list.map((r) => ({ to: r.email, name: r.name, unsubscribeUrl: unsubscribeUrl(r.email) }));
        const sent = await sendNewsletterBatch(items, subject, html);
        return { ok: true, message: `Newsletter sent to ${sent} recipient${sent === 1 ? "" : "s"}.`, key: Date.now() };
    } catch (e) {
        return { ok: false, message: `Send failed: ${(e as Error).message}`, key: Date.now() };
    }
}
