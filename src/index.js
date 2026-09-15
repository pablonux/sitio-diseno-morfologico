// Worker principal del sitio.
// Las páginas estáticas (public/index.html, public/admin/index.html) las sirve
// Cloudflare automáticamente a partir del binding de "assets" configurado en
// wrangler.jsonc — este script solo entra en juego para lo que NO es un archivo
// estático: /api/content, /api/admin/*, /img/*.

const DEFAULT_CONTENT = {
  hero: {
    docente: "María José Zamorano",
    ayudante: "Sofía Saade",
    curso: "2° año — Comisión B",
    ciclo: "2026"
  },
  exploracion: {
    texto: "Cada participante de la cátedra desarrolló un fanzine propio a partir de un tema formal específico — desde la relación entre positivo y negativo hasta el ritmo, la superposición o la imagen en movimiento. Este sitio reúne ese proceso: el trabajo de exploración inicial, la ejecución en clase y el resultado final de cada tema, pensado para completarse a medida que avanza la cursada.",
    imagenes: [],
    youtubeId: null
  },
  ejecucion: {
    texto: "Material visual y audiovisual del proceso de trabajo: diseño, planeamiento y desarrollo de las piezas durante las clases.",
    imagenes: [],
    youtubeId: null
  },
  temas: [
    { id: "positivo-negativo", nombre: "Positivo / Negativo", texto: "", imagenes: [], youtubeId: null },
    { id: "volumen", nombre: "Volumen", texto: "", imagenes: [], youtubeId: null },
    { id: "espacio", nombre: "Espacio", texto: "", imagenes: [], youtubeId: null },
    { id: "recorrido", nombre: "Recorrido", texto: "", imagenes: [], youtubeId: null },
    { id: "ritmo", nombre: "Ritmo", texto: "", imagenes: [], youtubeId: null },
    { id: "superposicion", nombre: "Superposición", texto: "", imagenes: [], youtubeId: null },
    { id: "forma", nombre: "Forma", texto: "", imagenes: [], youtubeId: null },
    { id: "color", nombre: "Color", texto: "", imagenes: [], youtubeId: null },
    { id: "horizontalidad", nombre: "Horizontalidad", texto: "", imagenes: [], youtubeId: null },
    { id: "repeticion", nombre: "Repetición", texto: "", imagenes: [], youtubeId: null },
    { id: "jerarquia", nombre: "Jerarquía", texto: "", imagenes: [], youtubeId: null },
    { id: "patron", nombre: "Patrón", texto: "", imagenes: [], youtubeId: null },
    { id: "variaciones", nombre: "Variaciones", texto: "", imagenes: [], youtubeId: null },
    { id: "fragmento", nombre: "Fragmento", texto: "", imagenes: [], youtubeId: null },
    { id: "linea", nombre: "Línea", texto: "", imagenes: [], youtubeId: null },
    { id: "imagen-en-movimiento", nombre: "Imagen en movimiento", texto: "", imagenes: [], youtubeId: null }
  ]
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function getStoredContent(env) {
  if (!env.CONTENT) return null;
  const raw = await env.CONTENT.get("site");
  return raw ? JSON.parse(raw) : null;
}

// GET /api/content — público, lo consume el sitio
async function handleContentGet(env) {
  let data = null;
  try { data = await getStoredContent(env); } catch (e) { data = null; }
  return json(data || DEFAULT_CONTENT);
}

// GET/PUT /api/admin/content — pensado para quedar detrás de Cloudflare Access
async function handleAdminContent(request, env) {
  if (request.method === "GET") {
    const raw = env.CONTENT ? await env.CONTENT.get("site") : null;
    return new Response(raw || "null", {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  if (request.method === "PUT") {
    if (!env.CONTENT) return json({ ok: false, error: "Falta el binding de KV 'CONTENT'." }, 500);
    let body;
    try { body = await request.json(); }
    catch (e) { return json({ ok: false, error: "JSON inválido" }, 400); }
    if (!body || typeof body !== "object" || !Array.isArray(body.temas) || !body.hero || !body.exploracion || !body.ejecucion) {
      return json({ ok: false, error: "Estructura inválida: se esperaba { hero, exploracion, ejecucion, temas[] }" }, 400);
    }
    await env.CONTENT.put("site", JSON.stringify(body));
    return json({ ok: true });
  }

  return json({ ok: false, error: "Método no permitido" }, 405);
}

// POST /api/admin/upload — sube una imagen a R2
async function handleUpload(request, env) {
  if (!env.IMAGES) return json({ ok: false, error: "Falta el binding de R2 'IMAGES'." }, 500);

  let formData;
  try { formData = await request.formData(); }
  catch (e) { return json({ ok: false, error: "No se pudo leer el form-data" }, 400); }

  const file = formData.get("file");
  const temaIdRaw = formData.get("temaId") || "general";
  const temaId = String(temaIdRaw).toLowerCase().replace(/[^a-z0-9-]/g, "") || "general";

  if (!file || typeof file === "string") return json({ ok: false, error: "Falta el archivo" }, 400);
  if (!file.type || !file.type.startsWith("image/")) return json({ ok: false, error: "Solo se permiten imágenes" }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ ok: false, error: "La imagen pesa más de 8MB" }, 400);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `temas/${temaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ ok: true, url: `/img/${key}` });
}

// GET /img/<key> — sirve las imágenes desde R2, sin protección (son públicas)
async function handleImg(pathname, env) {
  if (!env.IMAGES) return new Response("Falta el binding de R2 'IMAGES'", { status: 500 });
  const key = pathname.replace(/^\/img\//, "");
  if (!key) return new Response("No encontrado", { status: 404 });
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response("No encontrado", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === "/api/content" && request.method === "GET") return handleContentGet(env);
    if (p === "/api/admin/content") return handleAdminContent(request, env);
    if (p === "/api/admin/upload" && request.method === "POST") return handleUpload(request, env);
    if (p.startsWith("/img/") && request.method === "GET") return handleImg(p, env);

    // Cualquier otra ruta debería haber sido servida ya como archivo estático
    // (public/index.html, public/admin/index.html, etc.) antes de llegar acá.
    return new Response("No encontrado", { status: 404 });
  }
};
