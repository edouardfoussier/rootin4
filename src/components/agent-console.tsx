"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AgentMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  tools: string[];
  error?: boolean;
};

const SUGGESTED_PROMPTS = [
  "I have a ticket for match 87 — who will I actually see play?",
  "Which matches will France most likely play in?",
  "Run the tournament. Who lifts the trophy?",
  "Inspect your recent traces in Phoenix. Any bias you should correct?",
];

const TOOL_LABEL: Record<string, string> = {
  run_monte_carlo: "⚙ Monte Carlo",
  match_team_probabilities: "🎟 match probabilities",
  team_match_probabilities: "🧭 team path",
  update_priors: "✏️ priors updated",
  health: "🫀 health",
};

function toolLabel(name: string): string {
  // Phoenix MCP tools arrive namespaced (list-datasets, get-spans, ...)
  return TOOL_LABEL[name] ?? `🔭 phoenix · ${name}`;
}

/** Minimal markdown: paragraphs + **bold**. The agent stays prose-only. */
function AgentProse({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="text-[0.95rem] leading-relaxed text-ink">
          {para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**") ? (
              <strong key={j} className="font-semibold">
                {chunk.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{chunk}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

export function AgentConsole() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => () => sourceRef.current?.close(), []);

  const send = useCallback(
    (raw: string) => {
      const prompt = raw.trim();
      if (!prompt || busy) return;
      setBusy(true);
      setInput("");

      const agentId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: prompt, tools: [] },
        { id: agentId, role: "agent", text: "", tools: [] },
      ]);

      const url = new URL("/api/agent/stream", window.location.origin);
      url.searchParams.set("prompt", prompt);
      if (sessionRef.current) {
        url.searchParams.set("session_id", sessionRef.current);
      }

      const patchAgent = (fn: (m: AgentMessage) => AgentMessage) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === agentId ? fn(m) : m))
        );

      const source = new EventSource(url);
      sourceRef.current = source;

      const finish = () => {
        source.close();
        sourceRef.current = null;
        setBusy(false);
        window.dispatchEvent(new CustomEvent("rootin4:agent-turn-done"));
      };

      source.onmessage = (event) => {
        let payload: { type: string; [k: string]: unknown };
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        switch (payload.type) {
          case "session":
            sessionRef.current = String(payload.session_id);
            break;
          case "tool":
            patchAgent((m) =>
              m.tools.includes(String(payload.name))
                ? m
                : { ...m, tools: [...m.tools, String(payload.name)] }
            );
            break;
          case "token":
            patchAgent((m) => ({ ...m, text: m.text + String(payload.text) }));
            break;
          case "final":
            patchAgent((m) => ({ ...m, text: String(payload.text) }));
            break;
          case "error":
            patchAgent((m) => ({
              ...m,
              error: true,
              text:
                m.text ||
                "The agent hit a snag mid-thought. Try again in a few seconds.",
            }));
            break;
          case "done":
            finish();
            break;
        }
      };

      source.onerror = () => {
        patchAgent((m) => ({
          ...m,
          error: true,
          text:
            m.text ||
            "Lost the line to the agent. The backend may be cold-starting — try again.",
        }));
        finish();
      };
    },
    [busy]
  );

  return (
    <section className="glass-panel flex h-[36rem] flex-col rounded-2xl border-0 sm:h-[40rem]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 pt-6 pb-2 sm:px-7"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-start justify-center gap-5">
            <p className="max-w-md font-display text-2xl italic leading-snug text-ink">
              Ask about any of the 104 fixtures — or ask the agent to audit
              itself.
            </p>
            <div className="flex flex-col items-start gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-ink-line bg-paper/50 px-4 py-2 text-left text-sm text-ink-soft backdrop-blur transition hover:border-twilight hover:text-twilight"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-twilight/10 px-4 py-2.5 text-[0.95rem] leading-relaxed text-ink">
                    {m.text}
                  </p>
                </li>
              ) : (
                <li key={m.id} className="flex flex-col gap-2">
                  {m.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.tools.map((t) => (
                        <span
                          key={t}
                          className="label-mono rounded-full border border-ink-line bg-paper/40 px-2 py-0.5 text-[0.65rem] text-twilight"
                        >
                          {toolLabel(t)}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.text ? (
                    <div
                      className={
                        m.error
                          ? "max-w-[92%] text-sm italic text-horizon"
                          : "max-w-[92%]"
                      }
                    >
                      <AgentProse text={m.text} />
                    </div>
                  ) : (
                    <p className="label-mono animate-pulse text-ink-soft">
                      consulting the simulations…
                    </p>
                  )}
                </li>
              )
            )}
          </ol>
        )}
      </div>

      <form
        className="flex items-center gap-3 border-t border-ink-line/60 px-5 py-4 sm:px-7"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? "the agent is thinking…" : "Ask Rootin4 anything WC2026"}
          disabled={busy}
          className="flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-ink-soft/70 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-twilight px-5 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
