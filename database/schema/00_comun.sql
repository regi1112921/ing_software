-- =============================================================================
-- 00_comun.sql — Funciones compartidas por todas las tablas
-- =============================================================================

-- Mantiene la columna actualizado_en al día en cada UPDATE.
create or replace function fn_actualizar_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;
