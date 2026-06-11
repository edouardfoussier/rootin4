const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** Championship odds proxy for the agent page sidebar. */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/champions`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend responded ${res.status}`);
    return Response.json(await res.json());
  } catch {
    return Response.json({ iterations: 0, champions: [] });
  }
}
