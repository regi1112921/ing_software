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
| 403 | El rol del usuario no tiene acceso al módulo o acción (ver *Permisos por rol*) |
| 404 | El recurso no existe |
| 409 | Regla de negocio (perro no disponible, transición no permitida, estado controlado por la adopción) |
| 429 | Cuenta bloqueada por intentos de inicio de sesión fallidos |
| 503 | El servicio de Autenticación no responde |

## Permisos por rol (HU-07)

| Módulo / acción | `administrador` | `veterinario` | `responsable_adopciones` |
|-----------------|:---:|:---:|:---:|
| Dashboard | ✔ | — | — |
| Perros y catálogos (ver, registrar, editar) | ✔ | ✔ | ✔ |
| Historial médico (consultar) | ✔ | ✔ | ✔ |
| Registrar atención médica | ✔ | ✔ | — |
| Controles pendientes, registrar vacunas y desparasitaciones (HU-08) | ✔ | ✔ | — |
| Adopciones (todas las rutas) | ✔ | — | ✔ |
| Solicitudes web del catálogo (HU-09) | ✔ | — | ✔ |
| Seguimientos después de la adopción (HU-10 · seguimiento) | ✔ | — | ✔ |
| Catálogo público `/publico/*` | sin sesión | sin sesión | sin sesión |

- Sin permiso → `403`. El veterinario recibe la ficha del perro con `adopcion_vigente: null` (no ve datos del adoptante).
- Los roles están en `ROLES` (`@huellas/shared`); los del módulo de adopciones en `services/adopcion/src/permisos.js`.

**Bloqueo por intentos fallidos:** tras `LOGIN_MAX_INTENTOS` (3) fallos seguidos, la cuenta queda bloqueada
`LOGIN_MINUTOS_BLOQUEO` (5) minutos y el login responde `429`, aunque la contraseña sea correcta. En el penúltimo
intento el mensaje avisa que queda 1. Un login correcto reinicia el contador, y `scripts/asignar-contrasena.js` desbloquea la cuenta.
Los correos inexistentes y las cuentas desactivadas no se bloquean (mismo mensaje genérico).

## Endpoints

Especificación OpenAPI completa y colección de Postman en [`docs/api/`](../docs/api/README.md).

### Autenticación — http://localhost:3004
| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| POST | `/auth/login` | HU-02 · RF-01 · HU-07 | `{ correo, contrasena }` → `{ token, expira, usuario }`. Cuenta bloqueada → 429 |
| POST | `/auth/registro` | — | `{ nombre_completo, correo, contrasena }` → crea una cuenta con rol `responsable_adopciones` (201) y devuelve lo mismo que el login. Correo repetido → 409 |
| POST | `/auth/logout` | HU-03 · RF-02 | Cierra la sesión del token enviado (204) |
| GET | `/auth/sesion` | — | Usuario de la sesión (nombre y rol para el menú) |

### Adopción — http://localhost:3002
| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| GET | `/catalogos` | HU-04 | Razas activas, tamaños, estados del perro y de la adopción |
| GET | `/perros?buscar=&estado=` | HU-06 · RF-07/08/09 | Listado; `buscar` por nombre o raza, `estado` por código |
| GET | `/perros/:id` | HU-07 · RF-10 | Ficha con `adopcion_vigente` (`null` para veterinario) |
| POST | `/perros` | HU-04 · RF-05 | Registra. `fecha_nacimiento` **o** `edad_aproximada: { anios, meses }` |
| PUT | `/perros/:id` | HU-05 · RF-06 | Edita. `estado` solo `disponible`/`en_tratamiento` y no si hay adopción |
| GET | `/adopciones` | HU-11 · RF-15 | Listado, de la más reciente a la más antigua |
| GET | `/adopciones/:id` | HU-11 · RF-16 | Detalle con `transiciones_permitidas` |
| POST | `/adopciones` | HU-10 · RF-13/14/19 | `{ perro_id, adoptante: { nombre_completo, telefono, direccion, documento_identidad? }, fecha_solicitud?, observaciones? }` |
| PATCH | `/adopciones/:id/estado` | HU-12 · RF-17/18/19/20 | `{ estado: aprobada\|rechazada\|finalizada, fecha?, observaciones? }` |
| GET | `/adopciones/:id/seguimientos` | HU-10 · seguimiento | Seguimientos de la adopción, del más reciente al más antiguo |
| POST | `/adopciones/:id/seguimientos` | HU-10 · seguimiento | `{ tipo: visita\|llamada, observaciones, fecha?, con_problemas? }`. Solo adopciones finalizadas (409 si no); la fecha va de la entrega a hoy |
| PATCH | `/adopciones/:id/seguimientos/:seguimientoId` | HU-10 · seguimiento | `{ con_problemas }`: marca el seguimiento para revisarlo o lo desmarca cuando ya se revisó |
| GET | `/seguimientos/pendientes?dias=30` | HU-10 · seguimiento | Adopciones finalizadas sin seguimiento en los últimos `dias` (1–365), con `dias_sin_seguimiento` (desde la entrega si no hay ninguno) |
| GET | `/seguimientos/con-problemas` | HU-10 · seguimiento | Seguimientos marcados con problemas, con perro y adoptante |

### Catálogo público (HU-09) — servicio de Adopción, http://localhost:3002
Rutas **sin sesión** que usa el sitio [`catalogo/`](../catalogo/README.md):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/publico/filtros` | Tamaños, sexos y rangos de edad (`cachorro` < 12 meses, `joven` 12–35, `adulto` 36–95, `senior` ≥ 96) |
| GET | `/publico/perros?tamano=&sexo=&edad=` | Solo perros `disponible` y solo datos públicos. Con filtro de edad no salen los de edad desconocida |
| GET | `/publico/perros/:id` | Ficha; 404 si ya no está disponible |
| POST | `/publico/solicitudes` | `{ perro_id, nombre_completo, telefono, correo?, mensaje? }` → pre-solicitud `pendiente` (201). Repetida por la misma persona → 409. Límite por IP (`SOLICITUDES_PUBLICAS_MAXIMO`, 5 por hora) → 429. `sitio_web` es un campo trampa: si llega con texto responde 201 sin guardar |

Bandeja privada (administrador y responsable_adopciones):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/solicitudes-publicas?estado=` | Pendientes primero |
| GET | `/solicitudes-publicas/:id` | Detalle |
| POST | `/solicitudes-publicas/:id/descartar` | Solo si está pendiente (409 si no) |

Para convertirla, `POST /adopciones` acepta `solicitud_publica_id`: en la misma transacción la solicitud queda `convertida` y enlazada a la adopción.
Variables: `TRUST_PROXY` (saltos de proxy, para leer la IP real) y `CORS_ORIGENES` con el dominio del catálogo.

### Veterinaria — http://localhost:3001
| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| GET | `/veterinarios` | HU-09 · RF-12 | Usuarios activos con rol veterinario |
| GET | `/perros/:id/historial` | HU-08 · RF-11 | Atenciones de la más reciente a la más antigua |
| POST | `/consultas` | HU-09 · RF-12 | `{ perro_id, veterinario_id, fecha?, motivo, diagnostico, tratamiento, observaciones? }` |
| GET | `/controles/pendientes?dias=30` | HU-08 | Vacunas y desparasitaciones vencidas o que vencen dentro de `dias` (0–365). El último registro de cada vacuna (por nombre) y de cada tipo de desparasitación manda: al registrarlo de nuevo, sale de la lista. Sin perros adoptados |
| POST | `/vacunas` | HU-08 | `{ perro_id, veterinario_id, nombre, fecha_aplicacion?, fecha_proxima_dosis?, observaciones? }` |
| POST | `/desparasitaciones` | HU-08 | `{ perro_id, veterinario_id, tipo: interna\|externa, producto, fecha_aplicacion?, fecha_proxima?, observaciones? }` |

`GET /perros/:id/historial` incluye además `vacunas` y `desparasitaciones` (HU-08).

### Dashboard — http://localhost:3003
Solo el rol `administrador`; los demás roles reciben `403`. "Este mes" usa la fecha de la BD (`current_date`).

| Método | Ruta | HU · RF | Descripción |
|--------|------|---------|-------------|
| GET | `/resumen` | HU-13 · RF-03 | `{ total, por_estado: [{ codigo, nombre, cantidad }], indicadores: { en_albergue, disponibles, en_tratamiento, adopciones_mes, solicitudes_pendientes } }`. En el albergue = todos menos adoptados; pendientes = solicitudes en proceso o aprobadas |
| GET | `/perros-en-tratamiento` | HU-14 · RF-04 | Del ingreso más antiguo al más reciente |
| GET | `/adopciones-por-mes` | HU-13 | `{ meses: [{ mes: 'AAAA-MM', cantidad }] }`: adopciones finalizadas en los últimos 12 meses, incluidos los meses con 0 |

Todos los servicios exponen `GET /health`.

## Fuera de alcance (sin RF en el SRS)

Gestión de usuarios y subida de fotos
(la foto se guarda como URL).
