// src/app/(auth)/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import { randomRecipeImage } from "@/lib/recipes";

// A fresh recipe photo behind the auth card on each full load — so this
// segment renders per request instead of being statically cached. (Switching
// between /login and /register in-session keeps the same photo, since the
// layout persists across client navigation; a full reload re-rolls it.)
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    // Already signed in? The auth pages aren't for you — go to the dashboard.
    // (currentUser() returns null when logged out, so this is a no-op then.)
    const user = await currentUser();
    if (user) redirect("/dashboard");

    const bg = await randomRecipeImage();

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: "var(--ink, #1b2a1d)", // fallback before/without a photo
            }}
        >
            {/* Layer 1 — the random recipe photo (falls back to the ink bg above). */}
            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 0,
                    backgroundImage: bg ? `url("${bg}")` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            />
            {/* Layer 2 — tonal scrim + vignette, like the hero / maintenance overlays.
                Raise these alphas to darken further, or add `backdropFilter: "blur(2px)"`
                if a busy photo competes with the card. */}
            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1,
                    background:
                        "linear-gradient(180deg, rgba(20,30,20,.60), rgba(20,30,20,.82)), " +
                        "radial-gradient(120% 100% at 50% 25%, rgba(20,30,20,.25), rgba(20,30,20,.70))",
                }}
            />

            {/* plain div, NOT <header> — the global header rule would pin it to the top */}
            <div style={{ position: "relative", zIndex: 2, padding: "22px 28px" }}>
                <Link
                    href="/"
                    aria-label="vegan eating home"
                    style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                >
                    {/* white-on-dark logo, since the backdrop is now a dark photo */}
                    <img
                        src="/logo/logo.svg"
                        alt="vegan eating"
                        width={166}
                        height={44}
                        style={{ height: 44, width: "auto", display: "block" }}
                    />
                </Link>
            </div>

            <div
                style={{
                    position: "relative",
                    zIndex: 2,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 20px 60px",
                }}
            >
                {children}
            </div>
        </div>
    );
}