# Backend — Node.js + Express (microservicios)

Cuatro aplicaciones Express independientes que comparten una base PostgreSQL en Supabase.
La arquitectura y la propiedad de cada tabla están en [../docs/arquitectura.md](../docs/arquitectura.md).

| Servicio | Puerto | Carpeta | Historias (Jira) |
|----------|--------|---------|------------------|
| Autenticación | 3004 | `services/autenticacion` | HU-02, HU-03 |
| Veterinaria | 3001 | `services/veterinaria` | HU-08, HU-09 |
| Adopción | 3002 | `services/adopcion` | HU-04 a HU-07, HU-10 a HU-12 |
| Dashboard | 3003 | `services/dashboard` | HU-13, HU-14 |

```
backend/
├── package.json        npm workspaces + scripts (dev, start, test)
├── shared/src/         Código común: config, conexión a BD, errores, validación, sesión, app Express base
├── services/<servicio>/
│   ├── src/index.js    Arranca el servidor
│   ├── src/app.js      Arma el servicio (repositorios → servicios → controladores → rutas)
│   ├── src/routes/  src/controllers/  src/services/  src/repositories/
└── test/               Pruebas de integración (PostgreSQL en memoria con los scripts de database/)
```

## Puesta en marcha

Requisitos: Node.js 20 o superior y la base creada en Supabase (ver `database/README.md`).

```bash
cd backend
npm install
```

Copia `.env.example` (raíz del repositorio) a `.env` y pega la cadena de conexión del **Session pooler** de
Supabase en `DATABASE_URL`.

Los usuarios de los datos de prueba no tienen contraseña. Asigna una a quien vaya a iniciar sesión
(la pide por consola y la guarda como hash bcrypt):

```bash
npm run asignar-contrasena -w @huellas/autenticacion -- maria.alvarado@peluchin.test
```

Levanta los cuatro servicios a la vez:

```bash
npm run dev
```

`npm run dev` reinicia cada servicio al guardar un cambio; `npm start` los ejecuta sin vigilar cambios.

## Pruebas

```bash
npm test
```

No usan Supabase: levantan un PostgreSQL 17 en memoria (PGlite), ejecutan los mismos scripts de `database/`
con los datos de prueba y prueban los criterios de aceptación de cada HU contra la API.

## Convenciones de la API

- **Sesión:** todas las rutas (salvo `POST /auth/login`, `POST /auth/registro` y `GET /health`) exigen `Authorization: Bearer <token>`.
  Sin sesión válida responden `401`.
- **JSON** con nombres de campo en `snake_case`, iguales a las columnas de la BD. Fechas como `AAAA-MM-DD`.
- **Errores:** `{ "error": "mensaje" }` y, en errores de validación, `"detalles": [{ "campo", "mensaje" }]`.

| Código | Cuándo |
|--------|--------|
| 400 | Datos inválidos o faltantes |
| 401 | Sin sesión, sesión cerrada o credenciales incorrectas |
| 403 | El rol del usuario no tiene acceso (el Dashboard es solo para `administrador`) |
| 404 | El recurso no existe |
| 409 | Regla de negocio (perro no disponible, transición no permitida, estado controlado por la adopción) |
| 503 | El servicio de Autenticación no responde |

## Endpoints

### Autenticación — http://localhost:3004
| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| POST | `/auth/login` | HU-02 · RF-01 | `{ correo, contrasena }` → `{ token, expira, usuario }` |
| POST | `/auth/registro` | — | `{ nombre_completo, correo, contrasena }` → crea una cuenta con rol `personal` (201) y devuelve lo mismo que el login. Correo repetido → 409 |
| POST | `/auth/logout` | HU-03 · RF-02 | Cierra la sesión del token enviado (204) |
| GET | `/auth/sesion` | — | Usuario de la sesión (nombre y rol para el menú) |

### Adopción — http://localhost:3002
| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| GET | `/catalogos` | HU-04 | Razas activas, tamaños, estados del perro y de la adopción |
| GET | `/perros?buscar=&estado=` | HU-06 · RF-07/08/09 | Listado; `buscar` por nombre o raza, `estado` por código |
| GET | `/perros/:id` | HU-07 · RF-10 | Ficha con `adopcion_vigente` |
| POST | `/perros` | HU-04 · RF-05 | Registra. `fecha_nacimiento` **o** `edad_aproximada: { anios, meses }` |
| PUT | `/perros/:id` | HU-05 · RF-06 | Edita. `estado` solo `disponible`/`en_tratamiento` y no si hay adopción |
| GET | `/adopciones` | HU-11 · RF-15 | Listado, de la más reciente a la más antigua |
| GET | `/adopciones/:id` | HU-11 · RF-16 | Detalle con `transiciones_permitidas` |
| POST | `/adopciones` | HU-10 · RF-13/14/19 | `{ perro_id, adoptante: { nombre_completo, telefono, direccion, documento_identidad? }, fecha_solicitud?, observaciones? }` |
| PATCH | `/adopciones/:id/estado` | HU-12 · RF-17/18/19/20 | `{ estado: aprobada\|rechazada\|finalizada, fecha?, observaciones? }` |

### Veterinaria — http://localhost:3001
| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| GET | `/veterinarios` | HU-09 · RF-12 | Usuarios activos con rol veterinario |
| GET | `/perros/:id/historial` | HU-08 · RF-11 | Atenciones de la más reciente a la más antigua |
| POST | `/consultas` | HU-09 · RF-12 | `{ perro_id, veterinario_id, fecha?, motivo, diagnostico, tratamiento, observaciones? }` |

### Dashboard — http://localhost:3003
Solo el rol `administrador`; los demás roles reciben `403`. "Este mes" usa la fecha de la BD (`current_date`).

| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| GET | `/resumen` | HU-13 · RF-03 | `{ total, por_estado: [{ codigo, nombre, cantidad }], indicadores: { en_albergue, disponibles, en_tratamiento, adopciones_mes, solicitudes_pendientes } }`. En el albergue = todos menos adoptados; pendientes = solicitudes en proceso o aprobadas |
| GET | `/perros-en-tratamiento` | HU-14 · RF-04 | Del ingreso más antiguo al más reciente |
| GET | `/adopciones-por-mes` | HU-13 | `{ meses: [{ mes: 'AAAA-MM', cantidad }] }`: adopciones finalizadas en los últimos 12 meses, incluidos los meses con 0 |

Todos los servicios exponen `GET /health`.

## Fuera de alcance (sin RF en el SRS)

Permisos por rol (salvo el Dashboard, solo para administración), bloqueo por intentos fallidos, vacunas, gestión de usuarios y subida de fotos
(la foto se guarda como URL).
