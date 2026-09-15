// POST /api/admin/upload
// Recibe un form-data con:
//   file    -> el archivo de imagen
//   temaId  -> id del tema (o "exploracion" / "ejecucion" / "hero") para
//              organizar las imágenes en carpetas dentro del bucket
// Sube la imagen al bucket R2 "IMAGES" y devuelve { ok, url }.
// La url devuelta (/img/...) es pública y la sirve functions/img/[[path]].js —
// esta ruta en cambio queda protegida por Cloudflare Access (vive en /api/admin/*).

const MAX_BYTES = 8 * 1024 * 1024; // 8MB por imagen, ajustable

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.IMAGES) {
    return json({ ok: false, error: "Falta el binding de R2 'IMAGES' en este proyecto de Pages." }, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return json({ ok: false, error: "No se pudo leer el form-data" }, 400);
  }

  const file = formData.get("file");
  const temaIdRaw = formData.get("temaId") || "general";
  const temaId = String(temaIdRaw).toLowerCase().replace(/[^a-z0-9-]/g, "") || "general";

  if (!file || typeof file === "string") {
    return json({ ok: false, error: "Falta el archivo" }, 400);
  }
  if (!file.type || !file.type.startsWith("image/")) {
    return json({ ok: false, error: "Solo se permiten imágenes" }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ ok: false, error: "La imagen pesa más de 8MB" }, 400);
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `temas/${temaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  return json({ ok: true, url: `/img/${key}` });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}
