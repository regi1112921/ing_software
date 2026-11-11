-- =============================================================================
-- 2026-11-11_03_hu10_seguimientos.sql — HU-10: Seguimiento después de la adopción
--
-- Se ejecuta UNA sola vez sobre una base que ya tiene 2026-11-11_02_hu08_controles.sql.
-- Las instalaciones nuevas no la necesitan: schema/ y views/ ya incluyen estos cambios.
--
--   1. Tabla seguimientos_adopcion (visita / llamada, observaciones y marca
--      "con problemas"), solo para adopciones finalizadas y desde la entrega.
--   2. Vista v_seguimiento_adopciones: último seguimiento y días sin seguimiento
--      de cada adopción finalizada.
-- =============================================================================

begin;

-- 1. seguimientos_adopcion ---------------------------------------------------------
create table seguimientos_adopcion (
  id             bigint generated always as identity primary key,
  solicitud_id   bigint      not null references solicitudes_adopcion (id),
  fecha          date        not null default current_date,
  tipo           text        not null,
  observaciones  text        not null,
  con_problemas  boolean     not null default false,
  registrado_por bigint      not null references usuarios (id),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint ck_seguimientos_tipo          check (tipo in ('visita', 'llamada')),
  constraint ck_seguimientos_observaciones check (btrim(observaciones) <> '' and length(observaciones) <= 2000)
);

comment on table  seguimientos_adopcion is 'HU-10: visitas o llamadas de seguimiento después de una adopción finalizada.';
comment on column seguimientos_adopcion.con_problemas is 'true = el seguimiento detectó un problema y queda pendiente de revisión.';

create index ix_seguimientos_solicitud_fecha on seguimientos_adopcion (solicitud_id, fecha desc);
create index ix_seguimientos_con_problemas   on seguimientos_adopcion (fecha desc) where con_problemas;
create index ix_seguimientos_registrado_por  on seguimientos_adopcion (registrado_por);

create trigger trg_seguimientos_actualizado_en
  before update on seguimientos_adopcion
  for each row execute function fn_actualizar_timestamp();

-- La adopción debe estar finalizada y el seguimiento no puede ser anterior a la entrega.
create or replace function fn_validar_seguimiento()
returns trigger
language plpgsql
as $$
declare
  v_estado         text;
  v_fecha_adopcion date;
begin
  if tg_op = 'UPDATE' and new.solicitud_id <> old.solicitud_id then
    raise exception 'No se puede mover un seguimiento a otra adopción.'
      using errcode = 'check_violation';
  end if;

  select estado, fecha_adopcion into v_estado, v_fecha_adopcion
    from solicitudes_adopcion where id = new.solicitud_id;

  if v_estado is distinct from 'finalizada' then
    raise exception 'Solo se registran seguimientos de adopciones finalizadas (estado actual: %).', coalesce(v_estado, 'inexistente')
      using errcode = 'check_violation';
  end if;
  if new.fecha < v_fecha_adopcion then
    raise exception 'El seguimiento no puede ser anterior a la entrega del perro (%).', v_fecha_adopcion
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_seguimientos_validar
  before insert or update of solicitud_id, fecha on seguimientos_adopcion
  for each row execute function fn_validar_seguimiento();

-- 2. v_seguimiento_adopciones -------------------------------------------------------
create or replace view v_seguimiento_adopciones
with (security_invoker = true)
as
select
  s.id                as solicitud_id,
  s.perro_id,
  p.nombre            as perro_nombre,
  p.foto_url          as perro_foto_url,
  a.nombre_completo   as adoptante_nombre,
  a.telefono          as adoptante_telefono,
  s.fecha_adopcion,
  count(g.id)::int                                   as total_seguimientos,
  max(g.fecha)                                       as ultimo_seguimiento,
  (count(g.id) filter (where g.con_problemas))::int  as seguimientos_con_problemas,
  (current_date - coalesce(max(g.fecha), s.fecha_adopcion)) as dias_sin_seguimiento
from solicitudes_adopcion s
join perros     p on p.id = s.perro_id
join adoptantes a on a.id = s.adoptante_id
left join seguimientos_adopcion g on g.solicitud_id = s.id
where s.estado = 'finalizada'
group by s.id, p.id, a.id;

comment on view v_seguimiento_adopciones is 'HU-10: por cada adopción finalizada, total de seguimientos, el último, cuántos tienen problemas y los días sin seguimiento (desde la entrega si no hay ninguno).';

-- Igual que el resto: sin acceso desde la Data API de Supabase.
alter table seguimientos_adopcion enable row level security;
revoke execute on function fn_validar_seguimiento() from public;

do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on seguimientos_adopcion, v_seguimiento_adopciones from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
      execute format('revoke execute on function fn_validar_seguimiento() from %I', v_rol);
    end if;
  end loop;
end;
$$;

commit;
