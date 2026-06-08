// src/components/VeganizeTool.tsx
"use client";

import { useState } from "react";

export default function VeganizeTool() {
  const [recipe, setRecipe] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/veganize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong.");
      else setResult(data.result);
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="tool-box">
      <textarea
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
          placeholder={"Paste any recipe here — ingredients and method.\n\ne.g. 200g pancetta, 3 eggs, 100g parmesan, 400g spaghetti..."}
      />
        <button
            className="btn-primary"
            style={{ marginTop: 16, justifyContent: "center" }}
            onClick={run}
            disabled={loading || !recipe.trim()}
        >
          {loading ? "Veganizing…" : "Veganize this recipe"}
          {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          )}
        </button>

        {error && (
            <div className="tool-out" style={{ borderColor: "var(--carrot)", color: "var(--carrot-deep)" }}>{error}</div>
        )}
        {result && <div className="tool-out">{result}</div>}
      </div>
  );
}