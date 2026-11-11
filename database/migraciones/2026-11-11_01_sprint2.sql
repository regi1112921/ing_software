-- =============================================================================
-- 2026-11-11_01_sprint2.sql — Cambios de base de datos del Sprint 2
--
-- Se ejecuta UNA sola vez sobre una base que ya tiene la estructura del Sprint 1
-- (Supabase compartido o Docker local con datos). Las instalaciones nuevas no la
-- necesitan: los archivos de schema/ ya incluyen estos cambios.
--
--   1. Rol 'personal' → 'responsable_adopciones'                 (KAN-10)
--   2. Bloqueo de cuenta tras intentos fallidos                  (KAN-10)
--   3. Tabla solicitudes_publicas (catálogo público)             (KAN-12)
-- =============================================================================

begin;

-- 1. Roles ---------------------------------------------------------------------
alter table usuarios drop constraint ck_usuarios_rol;
update usuarios set rol = 'responsable_adopciones' where rol = 'personal';
alter table usuarios add constraint ck_usuarios_rol
  check (rol in ('administrador', 'veterinario', 'responsable_adopciones'));

comment on table usuarios is 'Personas que usan el sistema (administración, veterinaria y responsables de adopciones).';

-- 2. Bloqueo por intentos fallidos ----------------------------------------------
alter table usuarios
  add column intentos_fallidos int not null default 0,
  add column bloqueado_hasta  timestamptz,
  add constraint ck_usuarios_intentos check (intentos_fallidos >= 0);

comment on column usuarios.intentos_fallidos is 'Intentos de login fallidos seguidos. Vuelve a 0 al iniciar sesión correctamente.';
comment on column usuarios.bloqueado_hasta  is 'Si es futura, la cuenta no puede iniciar sesión hasta esa hora (3 intentos fallidos).';

-- 3. Solicitudes desde el catálogo público ---------------------------------------
create table solicitudes_publicas (
  id              bigint generated always as identity primary key,
  perro_id        bigint      not null references perros (id),
  nombre_completo text        not null,
  telefono        text        not null,
  correo          text,
  mensaje         text,
  estado          text        not null default 'pendiente',
  solicitud_id    bigint      references solicitudes_adopcion (id),
  revisado_por    bigint      references usuarios (id),
  revisado_en     timestamptz,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  constraint ck_solpub_nombre   check (btrim(nombre_completo) <> ''),
  constraint ck_solpub_telefono check (telefono ~ '^\+?[0-9]{7,15}$'),
  constraint ck_solpub_correo   check (
    correo is null or (correo = lower(btrim(correo)) and correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  constraint ck_solpub_mensaje  check (mensaje is null or length(mensaje) <= 1000),
  constraint ck_solpub_estado   check (estado in ('pendiente', 'convertida', 'descartada')),
  -- Convertida ⇔ enlazada a la solicitud formal; revisada ⇔ tiene quién y cuándo.
  constraint ck_solpub_conversion check ((estado = 'convertida') = (solicitud_id is not null)),
  constraint ck_solpub_revision   check (
    (estado = 'pendiente' and revisado_por is null and revisado_en is null)
    or (estado <> 'pendiente' and revisado_por is not null and revisado_en is not null)
  )
);

comment on table  solicitudes_publicas is 'Pre-solicitudes enviadas desde el catálogo público. El responsable de adopciones las revisa y las convierte en una solicitud_adopcion o las descarta.';
comment on column solicitudes_publicas.solicitud_id is 'Solicitud formal creada a partir de esta pre-solicitud (solo si estado = convertida).';

create index ix_solpub_estado on solicitudes_publicas (estado, creado_en desc);
create index ix_solpub_perro  on solicitudes_publicas (perro_id);
create unique index uq_solpub_solicitud on solicitudes_publicas (solicitud_id) where solicitud_id is not null;

create trigger trg_solicitudes_publicas_actualizado_en
  before update on solicitudes_publicas
  for each row execute function fn_actualizar_timestamp();

-- Igual que el resto de tablas: sin acceso desde la Data API de Supabase.
alter table solicitudes_publicas enable row level security;

do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on solicitudes_publicas from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
    end if;
  end loop;
end;
$$;

commit;
