# Frontend — Guía para el equipo

Esta carpeta contiene la **capa de presentación** del sistema del refugio.
Aquí solo va lo que ve el usuario: pantallas, formularios y tablas.
El frontend **nunca** se conecta a la base de datos; siempre pasa por la API del backend.

---

## 1. Tecnologías

| Herramienta | Uso |
|-------------|-----|
| React | Librería para la interfaz |
| Vite | Servidor de desarrollo y compilación |
| React Router | Navegación entre pantallas |
| `fetch` | Llamadas HTTP al backend |

---

## 2. Crear el proyecto (solo una persona, la primera vez)

Desde la carpeta `frontend/`:

```bash
npm create vite@latest . -- --template react
npm install
npm install react-router-dom
npm run dev          # abre http://localhost:5173
```

> Si Vite avisa que la carpeta no está vacía, elige **"Ignore files and continue"** (así se conservan las carpetas que ya existen).

Las demás personas solo necesitan clonar el repositorio y ejecutar:

```bash
npm install
npm run dev
```

---

## 3. Estructura de carpetas

```
frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                 Punto de entrada (monta <App />)
    ├── App.jsx                  Define las rutas
    ├── styles.css               Estilos globales
    │
    ├── api/                     Un archivo por servicio del backend
    │   ├── http.js              Función base para hacer peticiones
    │   ├── veterinaria.api.js
    │   ├── adopcion.api.js
    │   └── dashboard.api.js
    │
    ├── shared/                  Lo que usan VARIOS módulos
    │   └── components/          Layout (menú), tablas, botones...
    │
    └── modules/                 Un módulo por servicio
        ├── dashboard/
        │   ├── pages/           Pantallas completas (una por ruta)
        │   └── components/      Piezas usadas solo en este módulo
        ├── adopcion/
        │   ├── pages/
        │   └── components/
        └── veterinaria/
            ├── pages/
            └── components/
```

### ¿Dónde pongo mi archivo?

| Si estás creando... | Va en... |
|---------------------|----------|
| Una pantalla nueva (tiene su propia URL) | `modules/<servicio>/pages/` |
| Un formulario o tarjeta de un solo módulo | `modules/<servicio>/components/` |
| Algo que usan dos o más módulos | `shared/components/` |
| Una llamada al backend | `api/<servicio>.api.js` |

**Regla de oro:** un módulo **no importa** archivos de otro módulo. Si dos módulos necesitan lo mismo, se mueve a `shared/`.

---

## 4. Convenciones

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| Componentes y páginas | `PascalCase.jsx` | `AnimalForm.jsx` |
| Páginas | terminan en `Page` | `AnimalesPage.jsx` |
| Archivos de API | `<servicio>.api.js` | `adopcion.api.js` |
| Variables y funciones | `camelCase` | `listarAnimales` |
| Idioma | Español en nombres y textos | `crearSolicitud`, no `createRequest` |

- Un componente por archivo.
- Componentes de función (no clases).
- Mostrar siempre un mensaje si la API devuelve error.

---

## 5. Conexión con el backend

Cada servicio corre en su propio puerto. Para no escribir puertos en el código,
Vite redirige las rutas `/api/...` al servicio correcto.

| Prefijo en el frontend | Servicio | Puerto |
|------------------------|----------|--------|
| `/api/veterinaria` | Veterinaria | 3001 |
| `/api/adopcion` | Adopción | 3002 |
| `/api/dashboard` | Dashboard | 3003 |

Configuración en `vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = (puerto, prefijo) => ({
  target: `http://localhost:${puerto}`,
  rewrite: (path) => path.replace(prefijo, ''),
});

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/veterinaria': proxy(3001, '/api/veterinaria'),
      '/api/adopcion': proxy(3002, '/api/adopcion'),
      '/api/dashboard': proxy(3003, '/api/dashboard'),
    },
  },
});
```

### Endpoints disponibles

La lista completa está en [`../backend/README.md`](../backend/README.md). Resumen:

| Módulo | Endpoints principales |
|--------|-----------------------|
| Dashboard | `GET /resumen`, `GET /animales-por-estado`, `GET /adopciones-por-mes`, `GET /vacunas-proximas` |
| Adopción | `GET/POST /animales`, `GET/POST /adoptantes`, `GET/POST /solicitudes`, `PATCH /solicitudes/:id/aprobar` |
| Veterinaria | `GET /animales/:id/historial`, `POST /consultas`, `POST /vacunas`, `PATCH /animales/:id/aptitud` |

---

## 6. Plantillas

### 6.1 Función base — `src/api/http.js`

```js
export async function http(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}
```

### 6.2 Archivo de API de un servicio — `src/api/<servicio>.api.js`

```js
import { http } from './http.js';

const BASE = '/api/adopcion';

export const adopcionApi = {
  listarAnimales: () => http(`${BASE}/animales`),
  crearAnimal: (datos) => http(`${BASE}/animales`, { method: 'POST', body: datos }),
};
```

### 6.3 Página — `src/modules/<servicio>/pages/<Nombre>Page.jsx`

```jsx
import { useEffect, useState } from 'react';
import { adopcionApi } from '../../../api/adopcion.api.js';

export default function AnimalesPage() {
  const [animales, setAnimales] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    adopcionApi.listarAnimales()
      .then(setAnimales)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <h1>Animales</h1>
      {error && <p className="error">{error}</p>}
      <ul>
        {animales.map((a) => <li key={a.id}>{a.nombre}</li>)}
      </ul>
    </>
  );
}
```

### 6.4 Registrar la ruta — `src/App.jsx`

```jsx
import { Routes, Route } from 'react-router-dom';
import AnimalesPage from './modules/adopcion/pages/AnimalesPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/adopcion/animales" element={<AnimalesPage />} />
      {/* agrega aquí las demás rutas */}
    </Routes>
  );
}
```

---

## 7. Pantallas por hacer

Marca la casilla y pon tu nombre cuando tomes una tarea.

### Dashboard — `modules/dashboard/`
- [ ] `DashboardPage` — tarjetas con totales, animales por estado, adopciones por mes, vacunas próximas · *Responsable:*

### Adopción — `modules/adopcion/`
- [ ] `AnimalesPage` — lista de animales con filtro por estado + formulario de ingreso · *Responsable:*
- [ ] `AdoptantesPage` — lista y registro de adoptantes · *Responsable:*
- [ ] `SolicitudesPage` — crear solicitud, aprobar / rechazar · *Responsable:*

### Veterinaria — `modules/veterinaria/`
- [ ] `HistorialMedicoPage` — elegir animal, ver consultas, vacunas y tratamientos · *Responsable:*
- [ ] `ConsultaForm` / `VacunaForm` — formularios para registrar · *Responsable:*
- [ ] Botón "Marcar apto para adopción" · *Responsable:*

### Compartido — `shared/components/`
- [ ] `Layout` — menú lateral con enlaces a los tres módulos · *Responsable:*
- [ ] `DataTable` — tabla reutilizable · *Responsable:*

---

## 8. Flujo de trabajo con Git

```bash
git checkout main
git pull
git checkout -b front/<modulo>-<tarea>     # ej: front/adopcion-solicitudes
# ... trabajar ...
git add .
git commit -m "front(adopcion): pantalla de solicitudes"
git push -u origin front/adopcion-solicitudes
```

Luego abre un Pull Request hacia `main` y pide revisión a otra persona del equipo.

### Antes de abrir el Pull Request
- [ ] `npm run dev` funciona sin errores en la consola.
- [ ] El archivo está en la carpeta correcta (sección 3).
- [ ] Los nombres siguen las convenciones (sección 4).
- [ ] Se muestran mensajes cuando la API falla.
- [ ] No se importan archivos de otro módulo.
