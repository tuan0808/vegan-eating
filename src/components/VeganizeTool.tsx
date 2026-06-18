// src/components/VeganizeTool.tsx
import Link from "next/link";

// Veganizer is on the roadmap, not live yet. We keep the /veganize page but
// show a coming-soon state in place of the form. Inline styles so it renders
// regardless of how CSS is loaded on this page.

export default function VeganizeTool() {
  return (
      <div className="tool-box" style={{ textAlign: "center", padding: "44px 28px" }}>
      <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--carrot, #e15a22)",
            background: "rgba(225,90,34,0.08)",
            border: "1px solid rgba(225,90,34,0.25)",
            padding: "6px 14px",
            borderRadius: 999,
          }}
      >
        Coming soon
      </span>

        <h2
            style={{
              fontFamily: 'var(--display, "Fraunces", serif)',
              fontWeight: 500,
              fontSize: "clamp(26px, 5vw, 34px)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: "var(--ink, #1c2317)",
              margin: "18px 0 0",
            }}
        >
          The Veganizer is still simmering.
        </h2>

        <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--muted, #6f7468)",
              margin: "14px auto 0",
              maxWidth: "46ch",
            }}
        >
          Soon you&rsquo;ll paste in any recipe and we&rsquo;ll swap every animal
          ingredient for a tested plant-based stand-in &mdash; amounts adjusted,
          method tweaked. We&rsquo;re getting the swaps right before we open it up.
        </p>

        <p
            style={{
              fontFamily: 'var(--display, "Fraunces", serif)',
              fontStyle: "italic",
              fontSize: 17,
              color: "var(--green, #2f7d38)",
              margin: "22px auto 0",
              maxWidth: "46ch",
            }}
        >
          pancetta &rarr; smoky tempeh&nbsp;&nbsp;&middot;&nbsp;&nbsp;eggs &rarr; flax &amp;
          water&nbsp;&nbsp;&middot;&nbsp;&nbsp;parmesan &rarr; nutritional yeast
        </p>

        <p style={{ fontSize: 14, color: "var(--muted, #6f7468)", margin: "26px 0 0" }}>
          We&rsquo;ll announce it in The Dispatch. In the meantime,{" "}
          <Link
              href="/recipes"
              style={{
                color: "var(--green, #2f7d38)",
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "1.5px solid currentColor",
              }}
          >
            browse the recipe library &rarr;
          </Link>
        </p>
      </div>
  );
}