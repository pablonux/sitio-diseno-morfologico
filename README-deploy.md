# Deploy — Diseño Morfológico (Worker + static assets)

Este proyecto usa el modelo actual de Cloudflare: un Worker (`src/index.js`) que
sirve la API, más una carpeta `public/` con los archivos estáticos que Cloudflare
sirve automáticamente. Se despliega por Git (Workers Builds) con `npx wrangler deploy`.

## Estructura
```
public/index.html          sitio público
public/admin/index.html    panel de administración
src/index.js               Worker: /api/content, /api/admin/*, /img/*
wrangler.jsonc              configuración (bindings de KV y R2)
```

## 1. Crear el namespace de KV
Con Wrangler instalado localmente (`npm install -g wrangler` si no lo tenés, o `npx wrangler ...`):
```
npx wrangler kv namespace create CONTENT
```
Te va a devolver algo como:
```
{ binding = "CONTENT", id = "abcd1234..." }
```
Copiá ese `id` y pegalo en `wrangler.jsonc`, reemplazando `PEGAR_AQUI_EL_ID_DEL_NAMESPACE`.

(Alternativa sin terminal: Dashboard → Storage & databases → KV → Create namespace,
y copiás el ID que te muestra ahí.)

## 2. Crear el bucket de R2
```
npx wrangler r2 bucket create diseno-morfologico-images
```
Poné ese mismo nombre en `wrangler.jsonc`, reemplazando `PEGAR_AQUI_EL_NOMBRE_DEL_BUCKET`.

(Alternativa sin terminal: Dashboard → Storage & databases → R2 → Create bucket.)

## 3. Subir los cambios
```
git add .
git commit -m "Agregar bindings de KV y R2"
git push
```
Como el proyecto ya quedó conectado a Cloudflare (paso que hiciste en el wizard),
este push dispara un nuevo deploy automático — ahora sí con el `wrangler.jsonc`
completo, así que debería terminar en verde.

**Importante**: a diferencia de Pages clásico, acá los bindings viven en el
`wrangler.jsonc` del repo, no solo en el dashboard. Si agregás o cambiás un
binding desde el dashboard sin reflejarlo en este archivo, el próximo push
lo puede pisar.

## 4. Proteger /admin con Cloudflare Access
Zero Trust → Access → Applications → Add an application → Self-hosted.
- **Domain**: el dominio de tu Worker (ej. `sitio-diseno-morfologico.tu-cuenta.workers.dev`,
  o el dominio custom si le pusiste uno).
- **Path**: `/admin` — y otra aplicación (o la misma ampliada) cubriendo `/api/admin`.
- Policy "Allow" con tu email (y el de quien más administre el sitio).
- Login: "One-time PIN" por email — sin configuración adicional.

**No** uses el toggle "Protect with Cloudflare Access" del wizard de creación —
ese protege todo el Worker, incluido el sitio público. Esto de acá protege
solo las rutas que le indiques.

## 5. Probarlo local (opcional)
```
npx wrangler dev
```
Simula todo (Worker + assets) en tu máquina. Para que KV y R2 funcionen local
necesitás pasar `--local` (por defecto usa datos locales simulados, no los reales).
