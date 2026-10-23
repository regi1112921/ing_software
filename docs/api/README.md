# Documentación de la API

| Archivo | Qué es |
|---------|--------|
| [`openapi.yaml`](openapi.yaml) | Especificación OpenAPI 3.1 (Swagger) de los 4 servicios: rutas, cuerpos, respuestas y errores |
| [`huellas.postman_collection.json`](huellas.postman_collection.json) | Colección de Postman con 42 peticiones y sus pruebas, en el orden de las HU |
| [`local.postman_environment.json`](local.postman_environment.json) | Entorno de Postman: URLs de los servicios y usuarios de prueba de Docker |
| [`redocly.yaml`](redocly.yaml) | Reglas con las que CI valida `openapi.yaml` |

## Ver la especificación (Swagger)

- **Con Docker (recomendado):** `docker compose up --build` y abre **http://localhost:8081** (contenedor `swagger`).
- **En línea:** abre https://editor.swagger.io y pega el contenido de `openapi.yaml`.
- **En VS Code:** extensión *OpenAPI (Swagger) Editor* y abre `openapi.yaml`.
- **Con Redocly, en local:**

```bash
npx @redocly/cli@2.60.0 preview-docs docs/api/openapi.yaml
```

Cada ruta declara el puerto de su servicio, así que "Try it out" funciona con el sistema levantado
(`docker compose up`). Primero llama a `POST /auth/login` y pega el token en **Authorize**.

## Correr la colección de Postman

1. Levanta el sistema: `docker compose up --build`.
2. En Postman: **Import** → los dos archivos `.json` de esta carpeta → elige el entorno *HUELLAS · local (Docker)*.
3. Corre la colección completa con el **Runner**, en orden: cada carpeta guarda en variables los ids que usa la siguiente
   (token, perro, adopción).

Por terminal, igual que en CI:

```bash
npx newman@6.2.1 run docs/api/huellas.postman_collection.json -e docs/api/local.postman_environment.json
```

Se puede correr varias veces sobre la misma base: crea un perro y una cuenta nuevos en cada corrida.

| Carpeta | HU que prueba |
|---------|---------------|
| 0 · Salud | `GET /health` de los 4 servicios |
| 1 · Autenticación | HU-02 iniciar sesión, registro de cuenta |
| 2 · Perros | HU-04 registrar, HU-05 editar, HU-06 listar/buscar/filtrar, HU-07 ficha |
| 3 · Veterinaria | HU-08 historial, HU-09 registrar atención |
| 4 · Adopciones | HU-10 registrar, HU-11 consultar, HU-12 aprobar y finalizar (con los 409 de las reglas de negocio) |
| 5 · Dashboard | HU-13 indicadores, HU-14 perros en tratamiento, 403 para roles que no son administrador |
| 6 · Cerrar sesión | HU-03 cerrar sesión y token invalidado |

## Integración continua

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) corre en cada push y pull request:

| Job | Qué hace |
|-----|----------|
| Backend · pruebas | `npm test` en `backend/` (pruebas de aceptación con PostgreSQL en memoria) |
| Frontend · tipos y build | `npm run build` en `frontend/` |
| API · OpenAPI válido | `redocly lint` sobre `openapi.yaml` |
| API · colección de Postman | Levanta BD + 4 servicios con Docker Compose y corre la colección con Newman; sube el reporte JUnit como artefacto |

Si cambias un endpoint, actualiza `openapi.yaml` y la colección en el mismo PR: CI falla si la colección deja de pasar.
