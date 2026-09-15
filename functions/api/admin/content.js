// GET  /api/admin/content  → el panel de admin lo usa para precargar el formulario
// PUT  /api/admin/content  → guarda el contenido editado
//
// Esta ruta vive bajo /api/admin/*, que en Cloudflare Access queda configurada
// como aplicación protegida — solo llega tráfico autenticado. Igual conviene
// no depender de eso a ciegas (ver nota de seguridad en el mensaje del chat).

export async function onRequestGet(context) {
  const { env } = context;
  const raw = env.CONTENT ? await env.CONTENT.get("site") : null;
  const body = raw || "null";
  return new Response(body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;

  if (!env.CONTENT) {
    return new Response(JSON.stringify({ ok: false, error: "Falta el binding de KV 'CONTENT' en este proyecto de Pages." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // validación mínima de forma, para no guardar cualquier cosa por error
  if (!body || typeof body !== "object" || !Array.isArray(body.temas) || !body.hero || !body.exploracion || !body.ejecucion) {
    return new Response(JSON.stringify({ ok: false, error: "Estructura inválida: se esperaba { hero, exploracion, ejecucion, temas[] }" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  await env.CONTENT.put("site", JSON.stringify(body));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
