-- =============================================================================
-- 2026-11-27_05_hu13_avisos.sql — HU-13: Aviso al adoptante sobre su solicitud
--
-- Se ejecuta UNA sola vez sobre una base que ya tiene 2026-11-13_04_hu11_citas.sql.
-- Las instalaciones nuevas no la necesitan: schema/ ya incluye estos cambios.
--
--   1. Columna opcional solicitudes_adopcion.motivo_rechazo: el motivo que se le
--      comunica al adoptante (solo en solicitudes rechazadas).
--   2. Tabla notificaciones: registro de cada aviso (quién, cuándo, a qué teléfono y
--      el texto enviado). Aprobación solo si la solicitud está aprobada; rechazo solo
--      si está rechazada. El registro no se modifica ni se borra.
-- =============================================================================

begin;

-- 1. Motivo del rechazo. Las solicitudes rechazadas antes de este cambio quedan sin
--    motivo (null); desde la API es obligatorio al rechazar.
alter table solicitudes_adopcion add column motivo_rechazo text;
alter table solicitudes_adopcion add constraint ck_solicitudes_motivo_rechazo check (
  motivo_rechazo is null or (estado = 'rechazada' and btrim(motivo_rechazo) <> '' and length(motivo_rechazo) <= 500)
);
comment on column solicitudes_adopcion.motivo_rechazo is 'HU-13: motivo que se le comunica al adoptante. Solo en solicitudes rechazadas (obligatorio al rechazar desde la API).';

-- 2. Registro de avisos al adoptante.
create table notificaciones (
  id           bigint generated always as identity primary key,
  solicitud_id bigint      not null references solicitudes_adopcion (id),
  tipo         text        not null,
  canal        text        not null default 'whatsapp',
  telefono     text        not null,
  mensaje      text        not null,
  enviado_por  bigint      not null references usuarios (id),
  enviado_en   timestamptz not null default now(),

  constraint ck_notificaciones_tipo     check (tipo in ('aprobacion', 'rechazo')),
  constraint ck_notificaciones_canal    check (canal in ('whatsapp')),
  -- Número internacional sin '+' (formato de wa.me), con código de país.
  constraint ck_notificaciones_telefono check (telefono ~ '^[0-9]{8,15}$'),
  constraint ck_notificaciones_mensaje  check (btrim(mensaje) <> '' and length(mensaje) <= 2000)
);

comment on table  notificaciones is 'HU-13: avisos enviados al adoptante sobre su solicitud (aprobación o rechazo). Es un registro: no se edita ni se borra.';
comment on column notificaciones.telefono is 'Teléfono al que se envió, en formato internacional sin + (se antepone 591 si no tenía código de país).';
comment on column notificaciones.mensaje is 'Texto enviado tal como quedó (el responsable puede ajustarlo antes de enviarlo).';

create index ix_notificaciones_solicitud   on notificaciones (solicitud_id, enviado_en desc);
create index ix_notificaciones_enviado_por on notificaciones (enviado_por);

-- El aviso debe corresponder al estado de la solicitud: aprobación solo si está
-- aprobada; rechazo solo si está rechazada. El registro no se modifica después.
create or replace function fn_validar_notificacion()
returns trigger
language plpgsql
as $$
declare
  v_estado text;
begin
  if tg_op <> 'INSERT' then
    raise exception 'El registro de avisos no se puede modificar ni borrar.'
      using errcode = 'check_violation';
  end if;

  select estado into v_estado from solicitudes_adopcion where id = new.solicitud_id;

  if new.tipo = 'aprobacion' and v_estado is distinct from 'aprobada' then
    raise exception 'El aviso de aprobación exige una solicitud aprobada (estado actual: %).', coalesce(v_estado, 'inexistente')
      using errcode = 'check_violation';
  elsif new.tipo = 'rechazo' and v_estado is distinct from 'rechazada' then
    raise exception 'El aviso de rechazo exige una solicitud rechazada (estado actual: %).', coalesce(v_estado, 'inexistente')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_notificaciones_validar
  before insert or update or delete on notificaciones
  for each row execute function fn_validar_notificacion();

-- Igual que el resto: sin acceso desde la Data API de Supabase.
alter table notificaciones enable row level security;
revoke execute on function fn_validar_notificacion() from public;

do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on notificaciones from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
      execute format('revoke execute on function fn_validar_notificacion() from %I', v_rol);
    end if;
  end loop;
end;
$$;

commit;
