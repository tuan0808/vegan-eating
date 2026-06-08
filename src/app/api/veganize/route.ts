// src/app/api/veganize/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { recipe?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const recipe = body.recipe?.trim();
  if (!recipe) {
    return NextResponse.json({ error: "Please paste a recipe to veganize." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY. Copy .env.example to .env.local and add your key (see README)." },
        { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const msg = await anthropic.messages.create({
      // Swap the model id if needed — see https://docs.claude.com/en/docs/about-claude/models
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system:
          "You are a vegan recipe expert for the site 'vegan eating'. Convert any recipe the user gives you into a fully plant-based version. Replace each animal product with the best vegan alternative and give quantities. Keep this format: a one-line intro, then an 'Ingredients' list, then a numbered 'Method', then a short 'Swaps made' list explaining each substitution. Be concise and practical. Note that nutrition or allergen claims are estimates.",
      messages: [{ role: "user", content: `Veganize this recipe:\n\n${recipe}` }],
    });

    const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

    return NextResponse.json({ result: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}