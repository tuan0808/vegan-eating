// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unreadMessageCount, pendingPostCount } from "@/lib/community";
import { openContactCount } from "@/lib/contact";

export const dynamic = "force-dynamic";

// Lightweight badge feed for the header. The header is a client component and
// can't read the DB, so it polls this. Count = actionable items: unread DMs,
// plus open website inquiries for admins.
export async function GET() {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ count: 0, unread: 0, pending: 0, inquiries: 0 });

    const isAdmin = user.role === "ADMIN";

    const [unread, pending] = await Promise.all([
        unreadMessageCount(user.id),
        pendingPostCount(user.id),
    ]);

    // Guard the contact count so the badge still works if the ContactMessage
    // table hasn't been migrated yet.
    let inquiries = 0;
    if (isAdmin) {
        try {
            inquiries = await openContactCount();
        } catch {
            inquiries = 0;
        }
    }

    return NextResponse.json({ count: unread + inquiries, unread, pending, inquiries });
}