const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/**
 * Same-origin SSE proxy to the agent backend, so the browser's
 * EventSource never needs to know the Cloud Run URL (and CORS stays a
 * non-topic). Streams the upstream body through untouched.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get("prompt") ?? "";
  if (!prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }
  const sessionId = searchParams.get("session_id");

  const upstream = new URL(`${BACKEND_URL}/agent/stream`);
  upstream.searchParams.set("prompt", prompt);
  if (sessionId) upstream.searchParams.set("session_id", sessionId);

  const res = await fetch(upstream, {
    headers: { accept: "text/event-stream" },
  });
  if (!res.ok || !res.body) {
    return Response.json(
      { error: `agent backend responded ${res.status}` },
      { status: 502 }
    );
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
