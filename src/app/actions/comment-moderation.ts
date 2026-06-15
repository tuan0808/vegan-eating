// src/app/actions/comment-moderation.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth-helpers' // adjust if your helper lives elsewhere

const REVIEWED_KEY = 'comments_reviewed_at'

function isMod(role?: string | null) {
    return role === 'ADMIN' || role === 'MODERATOR'
}

// Every action re-checks the role server-side — the page guard is not enough on its own.
async function requireMod() {
    const user = await currentUser()
    return isMod(user?.role) ? user : null
}

/**
 * Single entry point for per-comment moderation.
 * op: "hide" | "approve" | "spam" | "delete"
 * - hide/approve/spam are soft (the row + IP survive for the audit trail)
 * - spam also blocklists the comment's IP in one move
 * - delete is the only hard, irreversible op
 */
export async function moderateComment(formData: FormData) {
    const user = await requireMod()
    if (!user) return

    const id = String(formData.get('id') ?? '')
    const op = String(formData.get('op') ?? '')
    const path = String(formData.get('path') ?? '/admin/comments')
    if (!id) return

    const comment = await prisma.comment.findUnique({
        where: { id },
        select: { ipAddress: true },
    })
    if (!comment) {
        revalidatePath(path)
        return
    }

    if (op === 'hide') {
        await prisma.comment.update({ where: { id }, data: { status: 'HIDDEN' } })
    } else if (op === 'approve') {
        await prisma.comment.update({ where: { id }, data: { status: 'APPROVED' } })
    } else if (op === 'spam') {
        await prisma.comment.update({ where: { id }, data: { status: 'SPAM' } })
        if (comment.ipAddress) {
            await prisma.blockedIp.upsert({
                where: { ip: comment.ipAddress },
                update: {},
                create: { ip: comment.ipAddress, reason: 'Spam comment' },
            })
        }
    } else if (op === 'delete') {
        await prisma.comment.delete({ where: { id } })
    }

    revalidatePath(path)
}

/** Stamp "everything up to now has been reviewed" — clears the dashboard badge. */
export async function markAllReviewed() {
    const user = await requireMod()
    if (!user) return
    const now = new Date().toISOString()
    await prisma.setting.upsert({
        where: { key: REVIEWED_KEY },
        update: { value: now },
        create: { key: REVIEWED_KEY, value: now },
    })
    revalidatePath('/admin/comments')
}

/** Lift an IP block. */
export async function unblockIp(formData: FormData) {
    const user = await requireMod()
    if (!user) return
    const ip = String(formData.get('ip') ?? '')
    if (ip) await prisma.blockedIp.deleteMany({ where: { ip } })
    revalidatePath(String(formData.get('path') ?? '/admin/comments'))
}