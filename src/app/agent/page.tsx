import type { Metadata } from "next";
import { Suspense } from "react";

import { AgentConsole } from "@/components/agent-console";
import { AgentSidebar } from "@/components/agent-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Rootin4 — Ask the agent",
  description:
    "Chat with the Gemini-powered World Cup 2026 ticket-intelligence agent.",
};

export default function AgentPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* pb clears the fixed agent ticker so the chat input stays visible */}
        <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-32 sm:pt-16">
          <section className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="label-mono">
                Gemini 2.5
              </Badge>
              <Badge variant="outline" className="label-mono">
                Google ADK
              </Badge>
              <Badge variant="outline" className="label-mono">
                Arize Phoenix MCP
              </Badge>
            </div>
            <h1 className="font-display text-5xl font-black leading-[0.95] text-ink sm:text-6xl">
              Ask the agent.
            </h1>
            <p className="max-w-prose text-base text-ink-soft sm:text-lg">
              Every answer is computed live: Gemini reasons over a Monte Carlo
              engine that replays the whole tournament thousands of times, and
              every step — each tool call, each token — is traced to{" "}
              <span className="font-display italic text-ink">
                Arize Phoenix
              </span>
              . Ask it to read those traces back and it will correct its own
              priors.
            </p>
          </section>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
            <Suspense fallback={null}>
              <AgentConsole />
            </Suspense>
            <AgentSidebar />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
