"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// This runs server-side in Convex, never in the browser — so the API key
// stays secret. Set it once with: npx convex env set ANTHROPIC_API_KEY sk-ant-...

export const askHost = action({
  args: {
    systemPrompt: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY n'est pas configurée sur ce déploiement Convex."
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: args.systemPrompt,
        messages: args.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur API Claude (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const reply = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    return { reply: reply || "Désolé, je n'ai pas de réponse pour l'instant." };
  },
});
