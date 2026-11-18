"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useStoredAccount } from "@/lib/use-stored-account";
import { clientAuthHref } from "@/lib/client-navigation";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Tu es l'hôte(sse) TABLE NOW. Réponds en français, ton
chaleureux et direct, messages courts (1 à 3 phrases), comme dans un vrai
chat. Tu aides les clients avec leurs questions sur leur réservation, le
dress code, le paiement fractionné, les politiques du club (contrôle
d'identité, âge minimum 18 ans, vestiaire payant, zone fumeur extérieure,
pas de sortie/re-entrée). Le prix affiché est fixe, aucune négociation. Si
une question sort de ce périmètre, propose gentiment de vérifier et de
revenir vers eux vite.`;

export default function ChatPage() {
  const askHost = useAction(api.chat.askHost);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Salut 👋 Je suis ton hôte TABLE NOW ce soir — une question sur ta réservation ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { token } = useStoredAccount("clients", clientAuthHref("login", "/client/chat"));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!token || !text || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const result = await askHost({
        token,
        systemPrompt: SYSTEM_PROMPT,
        messages: newMessages,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "L'hôte n'a pas pu répondre — réessaie dans un instant."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold">
            TABLE <span className="gradient-text">NOW</span>
          </Link>
          <Link
            href="/client/reservations"
            className="text-sm text-muted hover:text-text"
          >
            Mes réservations
          </Link>
        </div>

        <h1 className="mt-4 text-lg font-semibold">💬 Chat avec ton hôte</h1>

        <div className="card mt-4 flex-1 flex flex-col p-4 min-h-[400px]">
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "self-end gradient-bg text-white"
                    : "self-start bg-surface-alt border border-border"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-surface-alt border border-border rounded-2xl px-4 py-2 text-sm text-muted">
                L&apos;hôte écrit...
              </div>
            )}
            {error && (
              <p className="text-sm text-red" role="alert">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="mt-3 flex gap-2 pt-3 border-t border-border">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Écris ton message..."
              className="input-field flex-1 px-3 py-2.5 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-primary px-4 py-2.5 text-sm disabled:opacity-60"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
