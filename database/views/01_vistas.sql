-- =============================================================================
-- 01_vistas.sql — Datos calculados (no se guardan en las tablas)
-- =============================================================================

-- Edad en meses completos a una fecha de referencia (hoy por defecto).
-- Devuelve NULL si no se conoce la fecha de nacimiento.
create or replace function fn_edad_en_meses(p_fecha_nacimiento date, p_referencia date default current_date)
returns integer
language sql
stable
as $$
  select case
    when p_fecha_nacimiento is null then null
    else (extract(year from age(p_referencia, p_fecha_nacimiento)) * 12
        + extract(month from age(p_referencia, p_fecha_nacimiento)))::integer
  end;
$$;

-- Perros con los nombres de sus catálogos y su edad calculada.
-- security_invoker: respeta los permisos de quien consulta.
create or replace view v_perros
with (security_invoker = true)
as
select
  p.*,
  r.nombre  as raza,
  t.nombre  as tamano_nombre,
  e.nombre  as estado_nombre,
  fn_edad_en_meses(p.fecha_nacimiento) as edad_meses
from perros p
join razas         r on r.id     = p.raza_id
join tamanos       t on t.codigo = p.tamano
join estados_perro e on e.codigo = p.estado;

comment on view v_perros is 'Perros con raza, tamaño y estado legibles y edad_meses calculada. Si fecha_nacimiento_estimada = true, la edad es aproximada.';

-- HU-08: controles pendientes (vacunas y desparasitaciones).
-- Por cada perro toma el último registro de cada vacuna (por nombre) y de cada tipo de
-- desparasitación; si tiene fecha programada, está pendiente. Al registrar el control de
-- nuevo, el anterior deja de ser el último y sale de la lista.
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

-- HU-10: estado de los seguimientos de cada adopción finalizada.
-- dias_sin_seguimiento cuenta desde el último seguimiento o, si no hay ninguno, desde la entrega.
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
