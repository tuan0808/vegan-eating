// src/lib/bot-heuristics.ts
//
// Heuristic "does this account look automated?" scorer for the admin member
// list. It TRIAGES — it never acts on its own. A human confirms before we ban
// an account and block its IP, because a false positive here bans a real person
// and blocks their network.
//
// The signals are the tells of programmatic signups, tuned to be specific
// enough that ordinary usernames (incl. compound/foreign names like
// "BibiBlocksberg" or "johnschmidt") don't trip them:
//   - erratic capitalization: random upper/lower runs no human types
//     ("XacKLGmIgXuJcXZLHlxWj") — the strongest, most bot-specific signal
//   - sparse vowels / long consonant clusters: hallmarks of random strings
//   - Gmail dot-alias abuse: 3+ dots in a Gmail local part is the
//     "one inbox → infinite unique addresses" trick ("d.lbor.ovie.s@gmail.com")

export type AccountAssessment = {
    /** True once the combined score clears the review threshold. */
    likelyBot: boolean;
    /** Rough 0+ confidence; higher = more bot-like. */
    score: number;
    /** Human-readable reasons, shown to the admin so they can eyeball the call. */
    signals: string[];
};

const VOWELS = new Set("aeiouyAEIOUY");
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// The two bot-specific tells. A flag requires at least one of these OR a high
// combined score — so the weak signals (few vowels, consonant cluster) can't
// flag a normal name like "johnschmidt" on their own.
const STRONG_SIGNALS = ["erratic capitalization", "Gmail dot-alias pattern"];
const HIGH_SCORE = 3;

function assessUsername(raw: string): { score: number; signals: string[] } {
    const signals: string[] = [];
    let score = 0;
    // Strip separators so ".", "_" don't distort the letter statistics.
    const u = raw.replace(/[^A-Za-z0-9]/g, "");
    const letters = u.replace(/[^A-Za-z]/g, "");
    if (u.length < 10) return { score, signals }; // short handles are almost always fine

    // 1) Erratic capitalization — count case flips between adjacent letters.
    //    Random tokens flip constantly; real CamelCase flips a handful of times.
    let flips = 0;
    for (let i = 1; i < letters.length; i++) {
        const prevUpper = letters[i - 1] !== letters[i - 1].toLowerCase();
        const curUpper = letters[i] !== letters[i].toLowerCase();
        if (prevUpper !== curUpper) flips++;
    }
    if (letters.length >= 10 && flips / letters.length >= 0.4) {
        score += 2;
        signals.push("erratic capitalization");
    }

    // 2) Sparse vowels — random strings under-use vowels vs real words/names.
    if (letters.length >= 10) {
        let vowels = 0;
        for (const ch of letters) if (VOWELS.has(ch)) vowels++;
        if (vowels / letters.length < 0.22) {
            score += 1;
            signals.push("very few vowels");
        }
    }

    // 3) Long consonant cluster — 6+ consonants in a row is near-unpronounceable.
    //    (5 is left alone so names like "johnschmidt" pass.)
    let run = 0;
    let maxRun = 0;
    for (const ch of letters) {
        if (VOWELS.has(ch)) run = 0;
        else { run++; if (run > maxRun) maxRun = run; }
    }
    if (maxRun >= 6) {
        score += 1;
        signals.push("long consonant cluster");
    }

    // 4) Digit-heavy handle — half or more digits is unusual for a real name.
    const digits = (u.match(/\d/g) ?? []).length;
    if (u.length >= 10 && digits / u.length >= 0.5) {
        score += 1;
        signals.push("mostly digits");
    }

    return { score, signals };
}

function assessEmail(raw: string): { score: number; signals: string[] } {
    const signals: string[] = [];
    let score = 0;
    const at = raw.lastIndexOf("@");
    if (at < 1) return { score, signals };
    const local = raw.slice(0, at);
    const domain = raw.slice(at + 1).toLowerCase();

    // Gmail treats dots as insignificant, so 3+ dots in the local part is the
    // classic alias-generation trick (one inbox spawning many "unique" signups).
    if (GMAIL_DOMAINS.has(domain)) {
        const dots = (local.match(/\./g) ?? []).length;
        if (dots >= 3) {
            score += 2;
            signals.push("Gmail dot-alias pattern");
        }
    }

    return { score, signals };
}

/** Score an account for bot-likeness. Pure + side-effect free — safe to call per row. */
export function assessAccount(input: { username: string; email: string }): AccountAssessment {
    const u = assessUsername(input.username ?? "");
    const e = assessEmail(input.email ?? "");
    const score = u.score + e.score;
    const signals = [...u.signals, ...e.signals];
    const hasStrong = signals.some((s) => STRONG_SIGNALS.includes(s));
    return { likelyBot: hasStrong || score >= HIGH_SCORE, score, signals };
}
