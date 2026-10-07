// Shared inline styles for the staff Files pages (matches the admin Members page).
import type { CSSProperties } from "react";

export const kicker: CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--terra, #c2603a)",
};
export const h1: CSSProperties = {
    fontFamily: 'var(--display, "Fraunces", serif)',
    fontSize: 32,
    color: "var(--ink, #1c2317)",
    margin: "8px 0 0",
};
export const muted: CSSProperties = { color: "var(--muted, #6b7264)" };
export const card: CSSProperties = {
    background: "#fffdf7",
    border: "1px solid var(--line, #e6e3da)",
    borderRadius: 14,
    padding: 20,
};
export const button: CSSProperties = {
    border: 0,
    background: "var(--terra, #c2603a)",
    color: "#fff",
    borderRadius: 999,
    padding: "9px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
};
export const ghostButton: CSSProperties = {
    border: "1px solid var(--line, #d9d5c8)",
    background: "transparent",
    color: "var(--muted, #6b7264)",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
};
