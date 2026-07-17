// src/lib/handle-entropy.ts
//
// Heuristics that flag machine-generated usernames / display names — the kind a
// signup bot emits, e.g. "CVbnpiwOnDczPJxpeT", "@AcPQGgziXdWFnUqK". These read as
// random because they (a) flip letter-case mid-word far more than any human handle
// and (b) string together implausibly long consonant runs. We score, never hard-
// block on this alone (a real "xY7z" handle exists) — it feeds the admin triage
// panel and raises an account's overall suspicion, combined with email/IP signals.

const VOWELS = new Set("aeiou".split(""));

/** Fraction of adjacent character pairs that flip letter case (0–1). Random mixed-
 *  case strings sit high (~0.4+); "JohnSmith" is ~0.1, "janedoe" is 0. */
export function caseFlipRatio(s: string): number {
    const letters = s.replace(/[^A-Za-z]/g, "");
    if (letters.length < 2) return 0;
    let flips = 0;
    for (let i = 1; i < letters.length; i++) {
        const prevUpper = letters[i - 1] >= "A" && letters[i - 1] <= "Z";
        const currUpper = letters[i] >= "A" && letters[i] <= "Z";
        if (prevUpper !== currUpper) flips++;
    }
    return flips / (letters.length - 1);
}

/** Count of uppercase letters. Real "First Last"/CamelCase handles have at most a
 *  couple; random tokens ("AcPQGgziXdWFnUqK") are littered with them. */
export function uppercaseCount(s: string): number {
    let n = 0;
    for (const ch of s) if (ch >= "A" && ch <= "Z") n++;
    return n;
}

/** Longest run of consecutive consonants — random strings pile these up. */
export function maxConsonantRun(s: string): number {
    const letters = s.toLowerCase().replace(/[^a-z]/g, "");
    let run = 0;
    let max = 0;
    for (const ch of letters) {
        if (VOWELS.has(ch)) run = 0;
        else { run++; if (run > max) max = run; }
    }
    return max;
}

export type HandleVerdict = { suspicious: boolean; score: number; signals: string[] };

/**
 * Score a single handle (username or display name). Returns the raw signals so the
 * admin panel can explain *why* an account is flagged rather than showing a bare number.
 */
export function scoreHandle(handle: string | null | undefined): HandleVerdict {
    const signals: string[] = [];
    let score = 0;
    const h = (handle ?? "").trim();
    if (h.length < 3) return { suspicious: false, score: 0, signals };

    // Erratic capitalisation — but ONLY when capitals are scattered (3+). This
    // exempts ordinary "TuanNguyen"/"WilliamCam" (≤2 capitals) while still catching
    // random tokens, which are riddled with them.
    const flip = caseFlipRatio(h);
    if (flip >= 0.3 && uppercaseCount(h) >= 3) {
        score += 2;
        signals.push(`erratic capitalisation (${Math.round(flip * 100)}%)`);
    }

    // Long consonant runs — real names rarely exceed 5 (e.g. "jdmstar" = 5).
    const run = maxConsonantRun(h);
    if (run >= 6) { score += 2; signals.push(`${run}-consonant run`); }

    // Long, dense, mixed-case, no separators — the classic random-token shape.
    if (h.length >= 14 && !/[\s_.-]/.test(h) && /[a-z]/.test(h) && /[A-Z]/.test(h)) {
        score += 1;
        signals.push("long unbroken mixed-case token");
    }

    return { suspicious: score >= 2, score, signals };
}
