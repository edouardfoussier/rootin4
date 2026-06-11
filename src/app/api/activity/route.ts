const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** Real engine/agent activity proxy — feeds the bottom ticker. */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/activity`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`backend responded ${res.status}`);
    return Response.json(await res.json());
  } catch {
    return Response.json({ events: [], stats: null });
  }
}
