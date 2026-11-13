import { env } from "cloudflare:workers";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) return new Response("Invalid key", { status: 400 });
  if (!env.BUCKET) return new Response("Photo storage unavailable", { status: 503 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=300");
  return new Response(object.body, { headers });
}
