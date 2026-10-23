# Guía para correr el proyecto — HUELLAS

Hay dos formas de correr el sistema:

| Opción | Para qué | Necesitas |
|--------|----------|-----------|
| **A. Docker** (recomendada) | Probar todo con un comando, sin instalar Node ni PostgreSQL | Docker Desktop |
| **B. Local** | Desarrollar con recarga automática | Node.js 20+ y una base (Supabase o la de Docker) |

---

## A. Con Docker (todo en un comando)

### 1. Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **abierto**.
- Puertos libres: `8080` (app), `3001–3004` (servicios), `5433` (base de datos).

### 2. Levantar
Desde la raíz del repositorio:

```bash
docker compose up --build
```

La primera vez tarda unos minutos (descarga imágenes y compila). Cuando veas
`[huellas] Base lista.` y los servicios `healthy`, abre:

**http://localhost:8080**

> Para dejarlo corriendo en segundo plano: `docker compose up --build -d`

### 3. Iniciar sesión
Todos los usuarios de prueba tienen la contraseña **`huellas123`**:

| Correo | Rol |
|--------|-----|
| `maria.alvarado@peluchin.test` | Personal del albergue |
| `andres.ramirez@peluchin.test` | Veterinario |
| `lucia.torres@peluchin.test` | Veterinaria |
| `admin@peluchin.test` | Administrador |

Para usar otra contraseña, defínela **antes de crear la base** (la primera vez):

```bash
HUELLAS_CONTRASENA_DEV=otraClave docker compose up --build
```

### 4. Qué se levanta

```
navegador ──► frontend (nginx :8080) ──► /api/autenticacion → autenticacion :3004
                                     ├─► /api/veterinaria   → veterinaria   :3001
                                     ├─► /api/adopcion      → adopcion      :3002
                                     └─► /api/dashboard     → dashboard     :3003
                                                   todos ──► db (PostgreSQL 17 :5433)
```

| Contenedor | Qué hace |
|------------|----------|
| `db` | PostgreSQL. La primera vez ejecuta `database/instalar.sql`, los datos de prueba y asigna la contraseña de desarrollo (`database/docker/inicializar.sh`). |
| `autenticacion`, `veterinaria`, `adopcion`, `dashboard` | Los 4 servicios del backend (una misma imagen, `backend/Dockerfile`). |
| `frontend` | Compila React con Vite y lo sirve con nginx (`frontend/Dockerfile`, `frontend/nginx.conf`). |

### 5. Comandos útiles

```bash
docker compose ps                   # estado de los contenedores
docker compose logs -f adopcion     # ver los logs de un servicio
docker compose down                 # detener (los datos se conservan)
docker compose down -v              # detener y BORRAR la base (vuelve a los datos de prueba)
docker compose up --build frontend  # recompilar solo el frontend tras un cambio
```

Conectarte a la base con un cliente (DBeaver, pgAdmin, psql):
`host=localhost port=5433 user=huellas password=huellas dbname=huellas`

---

## B. En local (modo desarrollo)

### 1. Base de datos
Elige una:

- **Usar la de Docker** (más fácil): `docker compose up -d db`
  y en el `.env` de la raíz pon:
  ```env
  DATABASE_URL=postgres://huellas:huellas@localhost:5433/huellas
  DB_SSL=false
  ```
- **Usar Supabase**: copia `.env.example` a `.env`, pega la cadena del *Session pooler* y sigue
  [database/README.md](database/README.md) para crear la estructura y asignar contraseñas.

### 2. Backend (4 servicios)

```bash
cd backend
npm install
npm run dev          # levanta autenticación, veterinaria, adopción y dashboard
```

Pruebas del backend (no necesitan base de datos): `npm test`

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Vite redirige `/api/<servicio>` a `localhost:3001–3004`, así que el backend debe estar corriendo.

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Revisa tipos (TypeScript) y compila a `dist/` |
| `npm run typecheck` | Solo revisa tipos |
| `npm run preview` | Sirve la versión compilada |

---

## Problemas comunes

| Síntoma | Solución |
|---------|----------|
| `port is already allocated` | Otro programa usa ese puerto. Ciérralo o cambia el puerto de la izquierda en `docker-compose.yml` (ej. `"8081:80"`). |
| "No se pudo conectar con el servidor" en la app | El backend no está corriendo o aún está arrancando. Revisa `docker compose ps`. |
| "Usuario o contraseña incorrectos" con `huellas123` | La base se creó con otra contraseña. Ejecuta `docker compose down -v` y vuelve a levantar. |
| Cambié archivos de `database/` y no se aplican | Los scripts solo corren con la base vacía: `docker compose down -v && docker compose up --build`. |
| La sesión se cierra sola | Las sesiones viven en memoria del servicio de autenticación: si se reinicia, hay que volver a iniciar sesión. |
