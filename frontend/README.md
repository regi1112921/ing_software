# Frontend — Guía para el equipo

Esta carpeta contiene la **capa de presentación** del sistema del refugio (HUELLAS).
Aquí solo va lo que ve el usuario: pantallas, formularios y tablas.
El frontend **nunca** se conecta a la base de datos; siempre pasa por la API del backend.

Para levantar todo el sistema ver [../GUIA_EJECUCION.md](../GUIA_EJECUCION.md).

---

## 1. Tecnologías

| Herramienta | Uso |
|-------------|-----|
| React 19 | Librería para la interfaz |
| TypeScript | Tipos de los datos de la API y de los componentes |
| Vite | Servidor de desarrollo y compilación |
| React Router 7 | Navegación entre pantallas |
| `fetch` | Llamadas HTTP al backend (`src/api/http.ts`) |
| Tailwind CSS 4 | Estilos (colores del albergue en `src/index.css`) |
| lucide-react | Íconos |

---

## 2. Comandos

```bash
npm install
npm run dev          # http://localhost:5173 (el backend debe estar corriendo)
npm run build        # revisa tipos y compila a dist/
npm run typecheck    # solo revisa tipos
```

---

## 3. Estructura de carpetas

```
frontend/
├── index.html
├── vite.config.ts               Proxy /api/<servicio> → puerto del servicio
├── nginx.conf / Dockerfile      Imagen de producción (Docker)
├── mockup/                      Mockup original de Figma (solo referencia)
└── src/
    ├── main.tsx                 Punto de entrada
    ├── App.tsx                  Define las rutas
    ├── index.css                Estilos globales y colores
    │
    ├── api/                     Un archivo por servicio del backend
    │   ├── http.ts              Función base: token, errores { error, detalles }
    │   ├── tipos.ts             Formas de los datos que devuelve la API
    │   ├── autenticacion.api.ts
    │   ├── adopcion.api.ts
    │   ├── veterinaria.api.ts
    │   └── dashboard.api.ts
    │
    ├── shared/                  Lo que usan VARIOS módulos
    │   ├── components/          Layout, menú lateral, encabezado, campos, insignias…
    │   ├── hooks/useCarga.ts    Carga datos: { datos, error, cargando, recargar }
    │   ├── sesion/              Sesión del usuario (contexto + useSesion)
    │   └── utils/               Formato de fechas y edades, clases de estilos
    │
    └── modules/                 Un módulo por servicio
        ├── autenticacion/pages/ LoginPage
        ├── dashboard/           DashboardPage + tarjetas, tabla y distribución
        ├── adopcion/            Perros y adopciones (listados, formularios, fichas)
        └── veterinaria/         Historial médico y registro de atenciones
```

### ¿Dónde pongo mi archivo?

| Si estás creando... | Va en... |
|---------------------|----------|
| Una pantalla nueva (tiene su propia URL) | `modules/<servicio>/pages/` |
| Un formulario o tarjeta de un solo módulo | `modules/<servicio>/components/` |
| Algo que usan dos o más módulos | `shared/components/` |
| Una llamada al backend | `api/<servicio>.api.ts` |

**Regla de oro:** un módulo **no importa** archivos de otro módulo. Si dos módulos necesitan lo mismo,
se mueve a `shared/`. Cuando una pantalla necesita una pieza de otro módulo, la compone `App.tsx`
(ejemplo: la ficha del perro recibe el historial médico como `pestanaHistorial`).

---

## 4. Convenciones

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| Componentes y páginas | `PascalCase.tsx`, export default | `TarjetaPerro.tsx` |
| Páginas | terminan en `Page` | `PerrosPage.tsx` |
| Archivos de API | `<servicio>.api.ts` | `adopcion.api.ts` |
| Variables y funciones | `camelCase` | `listarPerros` |
| Idioma | Español en nombres y textos | `crearAdopcion`, no `createAdoption` |
| Importaciones | alias `@/` para `src/` | `import { http } from '@/api/http'` |

- Un componente por archivo, componentes de función.
- Mostrar siempre un mensaje si la API devuelve error (`MensajeError`) y los errores por campo (`Campo error=…`).
- Los filtros y pestañas viven en la URL (`?estado=`, `?pestana=`) para conservarlos al volver atrás.

---

## 5. Conexión con el backend

| Prefijo en el frontend | Servicio | Puerto |
|------------------------|----------|--------|
| `/api/autenticacion` | Autenticación | 3004 |
| `/api/veterinaria` | Veterinaria | 3001 |
| `/api/adopcion` | Adopción | 3002 |
| `/api/dashboard` | Dashboard | 3003 |

En desarrollo lo resuelve el proxy de Vite (`vite.config.ts`); en Docker, nginx (`nginx.conf`).
Ambos quitan el prefijo: `/api/adopcion/perros` → `http://localhost:3002/perros`.

`http.ts` agrega `Authorization: Bearer <token>` a cada petición. Si la API responde 401 con una sesión
abierta, la app vuelve al inicio de sesión con el aviso "Tu sesión expiró".

---

## 6. Pantallas y rutas

| Ruta | Pantalla | HU |
|------|----------|----|
| `/login` | Iniciar sesión | HU-02 |
| `/` | Dashboard: tarjetas, distribución y perros en tratamiento | HU-13, HU-14 |
| `/perros` | Listado con búsqueda y filtro por estado | HU-06 |
| `/perros/nuevo` · `/perros/:id/editar` | Registrar / editar perro | HU-04, HU-05 |
| `/perros/:id` | Ficha con pestañas Información, Historial médico y Adopción | HU-07, HU-08 |
| `/perros/:id/atenciones/nueva` | Registrar atención médica | HU-09 |
| `/adopciones` | Listado de adopciones con filtro por estado | HU-11 |
| `/adopciones/nueva` | Registrar adopción (`?perro=<id>` lo preselecciona) | HU-10 |
| `/adopciones/:id` | Detalle y cambio de estado | HU-11, HU-12 |
| Menú lateral | Usuario conectado y "Cerrar sesión" | HU-03 |

### Cambios respecto al mockup

El mockup de [`mockup/`](mockup/) se usó como guía visual. Se mantuvieron sus funcionalidades y se cambió:

- Nombre **Huellas** (el mockup decía *PawShelter*).
- Raza elegida del catálogo; edad por fecha exacta, **edad aproximada** o desconocida.
- Estado del perro: solo *Disponible* / *En tratamiento* a mano; bloqueado si lo controla una adopción.
- Veterinario responsable elegido de una lista (antes texto libre).
- Adopción: solo perros disponibles, documento opcional, *Fecha de solicitud* y sin selector de estado.
- Detalle de adopción: botones con **solo las transiciones permitidas**, fecha de la etapa, motivo obligatorio
  al rechazar y línea de tiempo con las fechas alcanzadas.
- Diseño adaptable a celular (menú desplegable), avisos de confirmación, estados de carga y error.
- Fechas sin desfase de zona horaria y fotos con marcador si no cargan.

---

## 7. Flujo de trabajo con Git

```bash
git checkout main
git pull
git checkout -b front/<modulo>-<tarea>     # ej: front/adopcion-solicitudes
# ... trabajar ...
git add .
git commit -m "feat(frontend): pantalla de solicitudes"
git push -u origin front/adopcion-solicitudes
```

Luego abre un Pull Request hacia `main` y pide revisión a otra persona del equipo.

### Antes de abrir el Pull Request
- [ ] `npm run build` termina sin errores.
- [ ] El archivo está en la carpeta correcta (sección 3).
- [ ] Los nombres siguen las convenciones (sección 4).
- [ ] Se muestran mensajes cuando la API falla.
- [ ] No se importan archivos de otro módulo.
