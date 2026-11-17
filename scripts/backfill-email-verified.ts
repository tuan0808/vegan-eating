// One-off backfill: mark every existing account that never verified its email as
// verified, so the older users who signed up pre-change aren't locked out now that
// email verification is disabled (see src/lib/auth-flags.ts).
//
// Runs against whatever DATABASE_URL is in the environment. SAFE BY DEFAULT: prints
// what it would do and exits. Pass --apply to actually write.
//
//   npx tsx scripts/backfill-email-verified.ts            # dry run (counts only)
//   npx tsx scripts/backfill-email-verified.ts --apply    # perform the update
//
// For production, run with the prod DATABASE_URL, e.g.:
//   DATABASE_URL="<prod-url>" npx tsx scripts/backfill-email-verified.ts --apply
import { prisma } from '@/lib/prisma'

const APPLY = process.argv.includes('--apply')

async function main() {
    const where = { emailVerified: null as null }
    const total = await prisma.user.count()
    const toFix = await prisma.user.count({ where })
    const banned = await prisma.user.count({ where: { ...where, banned: true } })
    const byRole = await prisma.user.groupBy({ by: ['role'], where, _count: true })

    console.log(`DB total users:            ${total}`)
    console.log(`Null emailVerified:        ${toFix}`)
    console.log(`  of which banned:         ${banned}`)
    console.log(`  by role:                 ${byRole.map((r) => `${r.role}=${r._count}`).join(', ') || '(none)'}`)

    if (toFix === 0) {
        console.log('\nNothing to backfill. ✓')
        return
    }

    if (!APPLY) {
        console.log(`\nDRY RUN — would set emailVerified=now() on ${toFix} account(s). Re-run with --apply to write.`)
        return
    }

    const res = await prisma.user.updateMany({ where, data: { emailVerified: new Date() } })
    const remaining = await prisma.user.count({ where })
    console.log(`\n✓ Updated ${res.count} account(s). Remaining null emailVerified: ${remaining}.`)
}

main()
    .catch((e) => {
        console.error('ERROR:', e?.message ?? e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
