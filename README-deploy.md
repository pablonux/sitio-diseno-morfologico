# Deploy — Diseño Morfológico (con panel de admin)

## Estructura
```
index.html                        sitio público
admin/index.html                  panel de administración
functions/api/content.js          GET público, lee el contenido
functions/api/admin/content.js    GET/PUT protegido (Access), lee y guarda el contenido
functions/api/admin/upload.js     POST protegido (Access), sube imágenes a R2
functions/img/[[path]].js         GET público, sirve las imágenes desde R2
seed-content.json                 contenido inicial, referencia para cargar en KV
```

## 1. Crear el namespace de KV
Dashboard → Workers & Pages → KV → Create namespace → nombre: `diseno-morfologico-content`.

## 2. Crear el bucket R2
Dashboard → R2 → Create bucket → nombre: `diseno-morfologico-images`.
(El plan gratis de R2 no requiere tarjeta para el uso dentro del free tier, pero Cloudflare puede pedir habilitar R2 en la cuenta la primera vez.)

## 3. Conectar el repo a Pages (si todavía no lo hiciste)
Workers & Pages → Create → Pages → Connect to Git → elegir el repo.
Build command: (vacío, no hay build) — Output directory: `/` (la raíz del repo, donde está este `index.html`).

## 4. Bindings del proyecto de Pages
Settings del proyecto → Functions → agregar:
- **KV namespace binding**: variable `CONTENT` → el namespace creado en el paso 1.
- **R2 bucket binding**: variable `IMAGES` → el bucket creado en el paso 2.

(Los nombres `CONTENT` e `IMAGES` tienen que ser exactos — son los que usa el código.)

## 5. Cargar el contenido inicial en KV (opcional)
Si no lo hacés, el sitio arranca igual mostrando el contenido de `seed-content.json`
embebido como valor por defecto en `functions/api/content.js` — apenas guardes algo
desde el admin, eso pasa a vivir en KV. Si preferís cargarlo de entrada:
```
npx wrangler kv key put --namespace-id=<ID_DEL_NAMESPACE> site --path=seed-content.json
```

## 6. Proteger /admin con Cloudflare Access
Zero Trust → Access → Applications → Add an application → Self-hosted.
- **Domain**: tu dominio del proyecto (ej. `diseno-morfologico.pages.dev`) — importante:
  agregar una aplicación para el dominio de producción exacto, y otra (o la misma con
  subdominio `*`) para cubrir los previews si los usás.
- **Path**: `/admin` (te va a pedir dos aplicaciones si querés cubrir también las rutas
  de API: `/admin*` y `/api/admin*`)
- Policy: "Allow" con tu email (y el de quien más vaya a administrar el sitio).
- Método de login recomendado: "One-time PIN" por email — no requiere que configures
  nada más, cada admin recibe un código por mail al entrar.

**Importante**: la ruta `/img/*` NO debe quedar dentro de la aplicación protegida —
son las fotos que tiene que poder ver cualquier visitante del sitio.

## 7. Probarlo local (opcional, antes de subir a Cloudflare)
```
npx wrangler pages dev . --kv CONTENT --r2 IMAGES
```
Esto simula KV y R2 en tu máquina (los datos no persisten entre reinicios, es solo
para probar que todo funciona antes de desplegar).
