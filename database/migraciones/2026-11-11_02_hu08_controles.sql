-- =============================================================================
-- 2026-11-11_02_hu08_controles.sql — HU-08: Alertas de vacunas y controles pendientes
--
-- Se ejecuta UNA sola vez sobre una base que ya tiene 2026-11-11_01_sprint2.sql.
-- Las instalaciones nuevas no la necesitan: schema/ y views/ ya incluyen estos cambios.
--
--   1. Tabla desparasitaciones (interna / externa), con fecha del próximo control.
--   2. Vista v_controles_pendientes: el último control de cada vacuna y de cada
--      tipo de desparasitación de cada perro que aún tiene una fecha programada.
--      Al registrar el control de nuevo, el anterior deja de estar pendiente.
-- =============================================================================

begin;

-- 1. desparasitaciones -------------------------------------------------------------
create table desparasitaciones (
  id               bigint generated always as identity primary key,
  perro_id         bigint      not null references perros (id),
  veterinario_id   bigint      not null references usuarios (id),
  consulta_id      bigint,
  tipo             text        not null,
  producto         text        not null,
  fecha_aplicacion date        not null default current_date,
  fecha_proxima    date,
  observaciones    text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),

  constraint fk_desparasitaciones_consulta_mismo_perro
    foreign key (consulta_id, perro_id) references consultas (id, perro_id),
  constraint ck_desparasitaciones_tipo     check (tipo in ('interna', 'externa')),
  constraint ck_desparasitaciones_producto check (btrim(producto) <> ''),
  constraint ck_desparasitaciones_proxima  check (fecha_proxima is null or fecha_proxima > fecha_aplicacion)
);

comment on table  desparasitaciones is 'Desparasitaciones internas o externas aplicadas a un perro y fecha del próximo control.';
comment on column desparasitaciones.consulta_id is 'Opcional: consulta en la que se aplicó.';

create index ix_desparasitaciones_perro_fecha on desparasitaciones (perro_id, fecha_aplicacion desc);
create index ix_desparasitaciones_proxima     on desparasitaciones (fecha_proxima) where fecha_proxima is not null;
create index ix_desparasitaciones_consulta    on desparasitaciones (consulta_id) where consulta_id is not null;
create index ix_desparasitaciones_veterinario on desparasitaciones (veterinario_id);

create trigger trg_desparasitaciones_actualizado_en
  before update on desparasitaciones
  for each row execute function fn_actualizar_timestamp();

create trigger trg_desparasitaciones_validar_veterinario
  before insert or update of veterinario_id on desparasitaciones
  for each row execute function fn_validar_veterinario();

-- 2. v_controles_pendientes -----------------------------------------------------------
create or replace view v_controles_pendientes
with (security_invoker = true)
as
with ultimos as (
  (select distinct on (v.perro_id, lower(btrim(v.nombre)))
          'vacuna'::text        as tipo,
          v.id                  as control_id,
          v.perro_id,
          v.nombre              as detalle,
          v.fecha_aplicacion    as ultima_aplicacion,
          v.fecha_proxima_dosis as fecha_programada
     from vacunas v
    order by v.perro_id, lower(btrim(v.nombre)), v.fecha_aplicacion desc, v.id desc)
  union all
  (select distinct on (d.perro_id, d.tipo)
          'desparasitacion'::text,
          d.id,
          d.perro_id,
          case d.tipo when 'interna' then 'Desparasitación interna' else 'Desparasitación externa' end,
          d.fecha_aplicacion,
          d.fecha_proxima
     from desparasitaciones d
    order by d.perro_id, d.tipo, d.fecha_aplicacion desc, d.id desc)
)
select
  u.tipo,
  u.control_id,
  u.perro_id,
  p.nombre   as perro_nombre,
  p.foto_url as perro_foto_url,
  p.estado   as perro_estado,
  u.detalle,
  u.ultima_aplicacion,
  u.fecha_programada,
  (u.fecha_programada - current_date)  as dias_restantes,
  (u.fecha_programada < current_date)  as vencido
from ultimos u
join perros p on p.id = u.perro_id
where u.fecha_programada is not null
  and p.estado <> 'adoptado';

comment on view v_controles_pendientes is 'HU-08: último control programado de cada vacuna y tipo de desparasitación por perro (sin perros adoptados). vencido = la fecha ya pasó.';

-- Igual que el resto: sin acceso desde la Data API de Supabase.
alter table desparasitaciones enable row level security;

do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on desparasitaciones, v_controles_pendientes from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
    end if;
  end loop;
end;
$$;

commit;
