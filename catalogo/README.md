# huellas-catalogo · Catálogo público de perros en adopción (HU-09)

Sitio público, **sin inicio de sesión**, separado del panel interno (`frontend/`). Muestra solo los perros
`disponible`, permite filtrarlos por **tamaño, edad y sexo** y, desde la ficha de cada perro, enviar una
**solicitud de adopción**. La solicitud llega al panel interno (menú *Solicitudes web*), donde el responsable
de adopciones contacta a la persona y la convierte en una adopción o la descarta.

React 19 + TypeScript + Vite + React Router + Tailwind CSS v4 (mismos colores que el panel).

## Qué usa del backend

Solo las rutas públicas del servicio de **Adopción** (puerto 3002):

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/publico/filtros` | Opciones de tamaño, sexo y rango de edad |
| GET | `/publico/perros?tamano=&sexo=&edad=` | Perros disponibles (datos públicos) |
| GET | `/publico/perros/:id` | Ficha (404 si ya no está disponible) |
| POST | `/publico/solicitudes` | Pre-solicitud de adopción (límite por IP, campo trampa para bots) |

El resto de la API sigue exigiendo sesión. Detalle en [`docs/api/openapi.yaml`](../docs/api/openapi.yaml).

## Desarrollo

```bash
cd catalogo
npm install
npm run dev        # http://localhost:5174
```

Vite redirige `/api/adopcion/*` a `http://localhost:3002`, así que el servicio de Adopción debe estar corriendo
(`docker compose up` o `npm run dev` en `backend/`). Si corre en otro lugar, define `VITE_API_ADOPCION`
(por ejemplo `http://localhost:3102`).

`npm run build` revisa tipos y compila a `dist/`.

## Docker

`docker compose up --build` lo sirve en **http://localhost:8082**. Su `nginx.conf` solo deja pasar
`/api/adopcion/publico/*` al servicio de Adopción; cualquier otra ruta de la API responde 404.

## Despliegue en Vercel

1. En Vercel: **Add New → Project**, importa el repositorio y elige **Root Directory: `catalogo`**.
   `vercel.json` ya define el build (`npm run build`), la salida (`dist`) y las rutas de la SPA.
2. En **Settings → Environment Variables** define `VITE_API_URL` con la URL pública del servicio de Adopción,
   sin barra final (por ejemplo `https://huellas-adopcion.onrender.com`). Es una variable de compilación:
   después de cambiarla hay que volver a desplegar.
3. En el servicio de Adopción (donde esté desplegado):
   - `CORS_ORIGENES` debe incluir el dominio del catálogo (por ejemplo `https://huellas.vercel.app`).
   - `TRUST_PROXY=1` si está detrás de un proxy (Render, Railway, nginx), para que el límite de solicitudes use la IP real.
   - Opcional: `SOLICITUDES_PUBLICAS_MAXIMO` y `SOLICITUDES_PUBLICAS_VENTANA_MINUTOS` (por defecto 5 por hora por IP).

El panel interno (`frontend/`) se despliega aparte; el catálogo no contiene ninguna pantalla ni ruta privada.

## Estructura

```
src/
├── api.ts                  Cliente de /publico (sin token) y tipos
├── utilidades.ts           Formato de edad, useCarga y clases comunes
├── componentes/            Marco (encabezado y pie), FotoPerro, TarjetaPerro, FormularioSolicitud
└── paginas/                CatalogoPage (filtros en la URL), PerroPage (ficha + solicitud), NoEncontradoPage
```
