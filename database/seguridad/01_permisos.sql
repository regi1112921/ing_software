-- =============================================================================
-- 01_permisos.sql — Permisos de acceso
--
-- Mecanismo confirmado: solo el backend (Express) accede a la base de datos,
-- conectándose con la cadena de conexión del proyecto (rol dueño de las tablas).
-- La autenticación de los usuarios la hace el backend con la tabla usuarios.
--
-- Supabase crea además una API pública (Data API) que usa los roles anon y
-- authenticated. Este sistema no la usa, así que se les quita todo acceso:
--   1. RLS activado en todas las tablas y sin políticas → la API no ve filas.
--   2. Se revocan los privilegios de anon y authenticated (defensa adicional).
-- El dueño de las tablas no está sujeto a RLS, así que el backend no se ve afectado.
-- =============================================================================

alter table tamanos              enable row level security;
alter table estados_perro        enable row level security;
alter table estados_solicitud    enable row level security;
alter table razas                enable row level security;
alter table usuarios             enable row level security;
alter table perros               enable row level security;
alter table adoptantes           enable row level security;
alter table solicitudes_adopcion enable row level security;
alter table consultas            enable row level security;
alter table vacunas              enable row level security;

-- Las funciones de PostgreSQL se pueden ejecutar por cualquiera (PUBLIC) por defecto.
revoke execute on function
  fn_actualizar_timestamp(),
  fn_validar_solicitud(),
  fn_sincronizar_estado_perro(),
  fn_validar_estado_perro(),
  fn_validar_veterinario(),
  fn_edad_en_meses(date, date)
from public;

-- anon y authenticated solo existen en Supabase; en un PostgreSQL local se omite.
do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format(
        'revoke all on tamanos, estados_perro, estados_solicitud, razas, usuarios, perros, adoptantes, '
        'solicitudes_adopcion, consultas, vacunas, v_perros from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
      execute format(
        'revoke execute on function fn_actualizar_timestamp(), fn_validar_solicitud(), fn_sincronizar_estado_perro(), '
        'fn_validar_estado_perro(), fn_validar_veterinario(), fn_edad_en_meses(date, date) from %I', v_rol);
    end if;
  end loop;
end;
$$;
