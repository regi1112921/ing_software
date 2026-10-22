-- =============================================================================
-- 01_usuarios.sql — Usuarios del sistema y sus roles
-- Autenticación propia: el backend valida el login comparando la contraseña
-- con password_hash (bcrypt). Nunca se guarda la contraseña en texto plano.
-- =============================================================================

create table usuarios (
  id              bigint generated always as identity primary key,
  nombre_completo text        not null,
  correo          text        not null,
  password_hash   text,
  rol             text        not null,
  activo          boolean     not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  constraint uq_usuarios_correo unique (correo),
  constraint ck_usuarios_nombre check (btrim(nombre_completo) <> ''),
  -- Se guarda en minúsculas para que el login no dependa de mayúsculas.
  constraint ck_usuarios_correo check (
    correo = lower(btrim(correo)) and correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  -- Solo acepta un hash bcrypt (60 caracteres). Impide guardar texto plano.
  -- NULL = cuenta sin contraseña asignada: no puede iniciar sesión.
  constraint ck_usuarios_password_hash check (
    password_hash is null or password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
  ),
  constraint ck_usuarios_rol check (rol in ('administrador', 'veterinario', 'personal'))
);

comment on table  usuarios is 'Personas que usan el sistema (administración, veterinaria y personal del albergue).';
comment on column usuarios.password_hash is 'Hash bcrypt generado por el backend. NULL = sin contraseña, no puede iniciar sesión.';
comment on column usuarios.activo is 'Las cuentas se desactivan en lugar de borrarse, para conservar la trazabilidad.';

create trigger trg_usuarios_actualizado_en
  before update on usuarios
  for each row execute function fn_actualizar_timestamp();
