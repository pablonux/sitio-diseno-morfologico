// GET /img/<lo que sea>
// Sirve archivos del bucket R2 "IMAGES". Pública a propósito: son las fotos
// del sitio, las tiene que poder ver cualquier visitante, no solo el admin.
// IMPORTANTE al configurar Cloudflare Access: la aplicación protegida debe
// cubrir /admin/* y /api/admin/* únicamente — nunca /img/*.

export async function onRequestGet(context) {
  const { env, params } = context;

  if (!env.IMAGES) {
    return new Response("Falta el binding de R2 'IMAGES'", { status: 500 });
  }

  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!key) return new Response("No encontrado", { status: 404 });

  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response("No encontrado", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(obj.body, { headers });
}
