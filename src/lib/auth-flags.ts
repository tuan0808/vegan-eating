// Master switch for the email-verification requirement.
//
// Turned OFF for now (Nov 2026): the audience skews older and the client found the
// "check your inbox and click a link before you can use the site" round-trip too
// confusing. While this is false:
//   • new accounts are created already-verified (emailVerified set at signup)
//   • no verification email is sent on signup or on an email change
//   • changing your email keeps you verified (no re-confirmation step)
//   • the "delete never-verified accounts" cron is paused, so legacy unverified
//     accounts (older users who never clicked the link) are NOT deleted
//
// Every gate that READS emailVerified (login in auth.ts, posting anti-spam, the
// veganize tool) is left untouched — a signup sets emailVerified, so those gates
// pass automatically. They stay as defensive code.
//
// To re-enable verification: flip this back to `true`. New signups will again be
// created unverified and emailed a link. Accounts created while this was false are
// already verified and unaffected. (Legacy null accounts stay locked until they
// verify — back-fill emailVerified for them separately if you want them let in.)
export const EMAIL_VERIFICATION_REQUIRED = false;
