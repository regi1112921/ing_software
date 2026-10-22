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
