// GET /api/content
// Público — lo consume el sitio para renderizar hero, exploración, ejecución y temas.
// Lee el JSON guardado en el namespace de KV "CONTENT" (clave "site").
// Si todavía no se guardó nada (primer deploy, antes de tocar el admin),
// devuelve este contenido por defecto, que es el mismo que tenía el sitio
// hardcodeado antes del panel de admin.

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

export async function onRequestGet(context) {
  const { env } = context;
  let data = null;

  try {
    if (env.CONTENT) {
      const raw = await env.CONTENT.get("site");
      if (raw) data = JSON.parse(raw);
    }
  } catch (e) {
    // si el JSON guardado está corrupto, preferimos servir el default
    // antes que romper el sitio público
    data = null;
  }

  if (!data) data = DEFAULT_CONTENT;

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // el contenido cambia solo cuando el admin guarda, pero preferimos
      // que siempre se pida fresco para que los cambios se vean al instante
      "Cache-Control": "no-store"
    }
  });
}
