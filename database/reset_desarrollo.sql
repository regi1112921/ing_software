-- =============================================================================
-- reset_desarrollo.sql — BORRA todas las tablas y datos del sistema
--
-- ⚠ Destructivo e irreversible. Solo para bases de desarrollo, y solo después
--   de avisar al equipo (la base de Supabase es compartida).
-- Después de ejecutarlo hay que volver a crear la estructura y los datos.
-- =============================================================================

begin;

drop view  if exists v_perros;
drop table if exists vacunas, consultas, solicitudes_adopcion, adoptantes, perros, usuarios,
  razas, estados_solicitud, estados_perro, tamanos;
drop function if exists
  fn_edad_en_meses(date, date),
  fn_validar_veterinario(),
  fn_validar_estado_perro(),
  fn_sincronizar_estado_perro(),
  fn_validar_solicitud(),
  fn_actualizar_timestamp();

commit;
