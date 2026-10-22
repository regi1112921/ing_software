-- =============================================================================
-- 01_verificaciones.sql — Pruebas de relaciones, restricciones y reglas
--
-- Se ejecuta DESPUÉS de crear la estructura. Todo corre dentro de una
-- transacción que termina en ROLLBACK: no deja datos en la base.
-- Cada prueba imprime "OK ..." (NOTICE). Si alguna falla, el script se detiene
-- con un error que empieza por "FALLÓ".
-- =============================================================================

begin;

-- Ejecuta p_sql y exige que falle con el código SQLSTATE indicado.
--   23514 = check_violation (CHECK y reglas de negocio de los triggers)
--   23503 = foreign_key_violation
--   23505 = unique_violation
create function pg_temp.esperar_error(p_descripcion text, p_sqlstate text, p_sql text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_sqlstate then
      raise notice 'OK  %', p_descripcion;
      return;
    end if;
    raise exception 'FALLÓ: % — se esperaba el error % y llegó %: %', p_descripcion, p_sqlstate, sqlstate, sqlerrm;
  end;
  raise exception 'FALLÓ: % — la operación debía ser rechazada y se aceptó', p_descripcion;
end;
$$;

create function pg_temp.verificar(p_descripcion text, p_condicion boolean)
returns void
language plpgsql
as $$
begin
  if p_condicion is distinct from true then
    raise exception 'FALLÓ: %', p_descripcion;
  end if;
  raise notice 'OK  %', p_descripcion;
end;
$$;

-- Guarda los id creados por las pruebas para usarlos en las sentencias.
create temp table t_ids (clave text primary key, id bigint not null);

create function pg_temp.id(p_clave text)
returns bigint
language sql
as $$ select id from t_ids where clave = p_clave $$;

create function pg_temp.raza()
returns bigint
language sql
as $$ select id from razas where nombre = 'Mestizo' $$;

-- -----------------------------------------------------------------------------
-- Datos base de las pruebas
-- -----------------------------------------------------------------------------
with u as (
  insert into usuarios (nombre_completo, correo, rol) values
    ('Prueba Personal',    'prueba.personal@peluchin.test',    'personal'),
    ('Prueba Veterinaria', 'prueba.veterinaria@peluchin.test', 'veterinario')
  returning id, rol
)
insert into t_ids select 'u_' || rol, id from u;

with p as (
  insert into perros (nombre, sexo, raza_id, tamano, fecha_ingreso, estado, registrado_por) values
    ('PruebaA', 'macho',  pg_temp.raza(), 'mediano', '2024-01-10', 'disponible',     pg_temp.id('u_personal')),
    ('PruebaB', 'hembra', pg_temp.raza(), 'pequeno', '2024-01-10', 'en_tratamiento', pg_temp.id('u_personal'))
  returning id, nombre
)
insert into t_ids select lower(nombre), id from p;

with a as (
  insert into adoptantes (nombre_completo, telefono, direccion, registrado_por) values
    ('Adoptante Prueba Uno', '3000000001', 'Calle 1', pg_temp.id('u_personal')),
    ('Adoptante Prueba Dos', '3000000002', 'Calle 2', pg_temp.id('u_personal'))
  returning id, telefono
)
insert into t_ids select 'adoptante_' || right(telefono, 1), id from a;

-- -----------------------------------------------------------------------------
-- 0. Catálogos
-- -----------------------------------------------------------------------------
select pg_temp.verificar('catálogos: 3 tamaños, 4 estados de perro y 4 de solicitud',
  (select count(*) from tamanos) = 3
  and (select count(*) from estados_perro) = 4
  and (select count(*) from estados_solicitud) = 4);
select pg_temp.esperar_error('razas: no se repite una raza aunque cambien las mayúsculas', '23505',
  $q$ insert into razas (nombre) values ('mestizo') $q$);
select pg_temp.esperar_error('razas: el nombre no puede tener espacios sobrantes', '23514',
  $q$ insert into razas (nombre) values (' Akita ') $q$);
select pg_temp.esperar_error('perros: la raza debe existir en el catálogo', '23503',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, registrado_por)
      values ('X', 'macho', -1, 'mediano', pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: el estado debe existir en el catálogo', '23503',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, estado, registrado_por)
      values ('X', 'macho', pg_temp.raza(), 'mediano', 'perdido', pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('catálogos: no se puede borrar un estado en uso', '23503',
  $q$ delete from estados_perro where codigo = 'disponible' $q$);
select pg_temp.esperar_error('catálogos: no se puede borrar una raza en uso', '23503',
  $q$ delete from razas where id = pg_temp.raza() $q$);

-- -----------------------------------------------------------------------------
-- 1. Usuarios
-- -----------------------------------------------------------------------------
select pg_temp.esperar_error('usuarios: rechaza un rol desconocido', '23514',
  $q$ insert into usuarios (nombre_completo, correo, rol) values ('X', 'x1@peluchin.test', 'jefe') $q$);
select pg_temp.esperar_error('usuarios: rechaza correo con mayúsculas', '23514',
  $q$ insert into usuarios (nombre_completo, correo, rol) values ('X', 'X2@Peluchin.test', 'personal') $q$);
select pg_temp.esperar_error('usuarios: rechaza correo duplicado', '23505',
  $q$ insert into usuarios (nombre_completo, correo, rol) values ('X', 'prueba.personal@peluchin.test', 'personal') $q$);
select pg_temp.esperar_error('usuarios: rechaza contraseña en texto plano', '23514',
  $q$ insert into usuarios (nombre_completo, correo, rol, password_hash) values ('X', 'x3@peluchin.test', 'personal', 'clave123') $q$);
with r as (
  insert into usuarios (nombre_completo, correo, rol, password_hash)
  values ('X', 'x4@peluchin.test', 'personal', '$2b$10$' || repeat('a', 53))
  returning 1
)
select pg_temp.verificar('usuarios: acepta un hash bcrypt', (select count(*) = 1 from r));

-- -----------------------------------------------------------------------------
-- 2. Perros
-- -----------------------------------------------------------------------------
select pg_temp.esperar_error('perros: rechaza un sexo inválido', '23514',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, registrado_por)
      values ('X', 'otro', pg_temp.raza(), 'mediano', pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: rechaza un tamaño que no está en el catálogo', '23503',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, registrado_por)
      values ('X', 'macho', pg_temp.raza(), 'gigante', pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: nacimiento estimado exige una fecha', '23514',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, fecha_nacimiento_estimada, registrado_por)
      values ('X', 'macho', pg_temp.raza(), 'mediano', true, pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: nacimiento no puede ser posterior al ingreso', '23514',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, fecha_nacimiento, fecha_ingreso, registrado_por)
      values ('X', 'macho', pg_temp.raza(), 'mediano', '2024-05-01', '2024-01-01', pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: foto_url debe ser una URL http(s)', '23514',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, foto_url, registrado_por)
      values ('X', 'macho', pg_temp.raza(), 'mediano', 'C:\fotos\x.jpg', pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: registrado_por debe ser un usuario existente', '23503',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, registrado_por)
      values ('X', 'macho', pg_temp.raza(), 'mediano', -1) $q$);
select pg_temp.esperar_error('perros: no se puede registrar directamente como adoptado', '23514',
  $q$ insert into perros (nombre, sexo, raza_id, tamano, estado, registrado_por)
      values ('X', 'macho', pg_temp.raza(), 'mediano', 'adoptado', pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: no se puede poner en_adopcion sin solicitud', '23514',
  $q$ update perros set estado = 'en_adopcion' where id = pg_temp.id('pruebaa') $q$);

-- -----------------------------------------------------------------------------
-- 3. Solicitudes de adopción y coherencia con el estado del perro
-- -----------------------------------------------------------------------------
select pg_temp.esperar_error('solicitudes: una solicitud nueva no puede empezar aprobada', '23514',
  $q$ insert into solicitudes_adopcion (perro_id, adoptante_id, estado, fecha_aprobacion, registrado_por)
      values (pg_temp.id('pruebaa'), pg_temp.id('adoptante_1'), 'aprobada', current_date, pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('solicitudes: un perro en tratamiento no se puede solicitar', '23514',
  $q$ insert into solicitudes_adopcion (perro_id, adoptante_id, registrado_por)
      values (pg_temp.id('pruebab'), pg_temp.id('adoptante_1'), pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('solicitudes: el adoptante debe existir', '23503',
  $q$ insert into solicitudes_adopcion (perro_id, adoptante_id, registrado_por)
      values (pg_temp.id('pruebaa'), -1, pg_temp.id('u_personal')) $q$);

-- Primera solicitud válida para PruebaA
with s as (
  insert into solicitudes_adopcion (perro_id, adoptante_id, fecha_solicitud, registrado_por)
  values (pg_temp.id('pruebaa'), pg_temp.id('adoptante_1'), '2024-02-01', pg_temp.id('u_personal'))
  returning id
)
insert into t_ids select 'sol_1', id from s;

select pg_temp.verificar('solicitudes: al crearla, el perro pasa a en_adopcion',
  (select estado = 'en_adopcion' from perros where id = pg_temp.id('pruebaa')));
select pg_temp.esperar_error('solicitudes: solo una solicitud activa por perro', '23514',
  $q$ insert into solicitudes_adopcion (perro_id, adoptante_id, registrado_por)
      values (pg_temp.id('pruebaa'), pg_temp.id('adoptante_2'), pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: no se puede pasar a disponible con una solicitud activa', '23514',
  $q$ update perros set estado = 'disponible' where id = pg_temp.id('pruebaa') $q$);
select pg_temp.esperar_error('perros: no se puede pasar a en_tratamiento con una solicitud activa', '23514',
  $q$ update perros set estado = 'en_tratamiento' where id = pg_temp.id('pruebaa') $q$);
select pg_temp.esperar_error('solicitudes: no se puede saltar de en_proceso a finalizada', '23514',
  $q$ update solicitudes_adopcion set estado = 'finalizada', fecha_aprobacion = '2024-02-05', fecha_adopcion = '2024-02-06'
      where id = pg_temp.id('sol_1') $q$);
select pg_temp.esperar_error('solicitudes: aprobar exige fecha_aprobacion', '23514',
  $q$ update solicitudes_adopcion set estado = 'aprobada' where id = pg_temp.id('sol_1') $q$);
select pg_temp.esperar_error('solicitudes: la aprobación no puede ser anterior a la solicitud', '23514',
  $q$ update solicitudes_adopcion set estado = 'aprobada', fecha_aprobacion = '2024-01-01' where id = pg_temp.id('sol_1') $q$);
select pg_temp.esperar_error('solicitudes: no se puede cambiar el perro de una solicitud', '23514',
  $q$ update solicitudes_adopcion set perro_id = pg_temp.id('pruebab') where id = pg_temp.id('sol_1') $q$);

-- Rechazo: el perro vuelve a estar disponible
update solicitudes_adopcion set estado = 'rechazada', fecha_rechazo = '2024-02-03' where id = pg_temp.id('sol_1');
select pg_temp.verificar('solicitudes: al rechazarla, el perro vuelve a disponible',
  (select estado = 'disponible' from perros where id = pg_temp.id('pruebaa')));
select pg_temp.esperar_error('solicitudes: una solicitud rechazada no se puede reabrir', '23514',
  $q$ update solicitudes_adopcion set estado = 'en_proceso', fecha_rechazo = null where id = pg_temp.id('sol_1') $q$);

-- Segunda solicitud: en_proceso → aprobada → finalizada
with s as (
  insert into solicitudes_adopcion (perro_id, adoptante_id, fecha_solicitud, registrado_por)
  values (pg_temp.id('pruebaa'), pg_temp.id('adoptante_2'), '2024-02-10', pg_temp.id('u_personal'))
  returning id
)
insert into t_ids select 'sol_2', id from s;

update solicitudes_adopcion set estado = 'aprobada', fecha_aprobacion = '2024-02-15' where id = pg_temp.id('sol_2');
select pg_temp.verificar('solicitudes: aprobada mantiene al perro en_adopcion',
  (select estado = 'en_adopcion' from perros where id = pg_temp.id('pruebaa')));

update solicitudes_adopcion set estado = 'finalizada', fecha_adopcion = '2024-02-20' where id = pg_temp.id('sol_2');
select pg_temp.verificar('solicitudes: al finalizarla, el perro queda adoptado',
  (select estado = 'adoptado' from perros where id = pg_temp.id('pruebaa')));
select pg_temp.esperar_error('solicitudes: una solicitud finalizada no cambia de estado', '23514',
  $q$ update solicitudes_adopcion set estado = 'rechazada', fecha_adopcion = null, fecha_rechazo = '2024-03-01'
      where id = pg_temp.id('sol_2') $q$);
select pg_temp.esperar_error('solicitudes: un perro adoptado no recibe nuevas solicitudes', '23514',
  $q$ insert into solicitudes_adopcion (perro_id, adoptante_id, registrado_por)
      values (pg_temp.id('pruebaa'), pg_temp.id('adoptante_1'), pg_temp.id('u_personal')) $q$);
select pg_temp.esperar_error('perros: un perro adoptado no vuelve a disponible a mano', '23514',
  $q$ update perros set estado = 'disponible' where id = pg_temp.id('pruebaa') $q$);

-- -----------------------------------------------------------------------------
-- 4. Historial médico
-- -----------------------------------------------------------------------------
select pg_temp.esperar_error('consultas: el responsable debe tener rol veterinario', '23514',
  $q$ insert into consultas (perro_id, veterinario_id, motivo, diagnostico, tratamiento)
      values (pg_temp.id('pruebab'), pg_temp.id('u_personal'), 'Control', 'Sano', 'Ninguno') $q$);
select pg_temp.esperar_error('consultas: motivo, diagnóstico y tratamiento no pueden estar vacíos', '23514',
  $q$ insert into consultas (perro_id, veterinario_id, motivo, diagnostico, tratamiento)
      values (pg_temp.id('pruebab'), pg_temp.id('u_veterinario'), '  ', 'Sano', 'Ninguno') $q$);

with c as (
  insert into consultas (perro_id, veterinario_id, fecha, motivo, diagnostico, tratamiento)
  values (pg_temp.id('pruebab'), pg_temp.id('u_veterinario'), '2024-03-01', 'Control', 'Sano', 'Desparasitación')
  returning id
)
insert into t_ids select 'consulta_b', id from c;

select pg_temp.esperar_error('vacunas: la próxima dosis debe ser posterior a la aplicación', '23514',
  $q$ insert into vacunas (perro_id, veterinario_id, nombre, fecha_aplicacion, fecha_proxima_dosis)
      values (pg_temp.id('pruebab'), pg_temp.id('u_veterinario'), 'Antirrábica', '2024-03-01', '2024-03-01') $q$);
select pg_temp.esperar_error('vacunas: la consulta debe ser del mismo perro', '23503',
  $q$ insert into vacunas (perro_id, veterinario_id, consulta_id, nombre)
      values (pg_temp.id('pruebaa'), pg_temp.id('u_veterinario'), pg_temp.id('consulta_b'), 'Antirrábica') $q$);
with r as (
  insert into vacunas (perro_id, veterinario_id, consulta_id, nombre, fecha_aplicacion, fecha_proxima_dosis)
  values (pg_temp.id('pruebab'), pg_temp.id('u_veterinario'), pg_temp.id('consulta_b'), 'Antirrábica', '2024-03-01', '2025-03-01')
  returning 1
)
select pg_temp.verificar('vacunas: acepta una vacuna ligada a una consulta del mismo perro', (select count(*) = 1 from r));

-- -----------------------------------------------------------------------------
-- 5. Borrado protegido (no se pierde el historial)
-- -----------------------------------------------------------------------------
select pg_temp.esperar_error('perros: no se puede borrar un perro con historial médico', '23503',
  $q$ delete from perros where id = pg_temp.id('pruebab') $q$);
select pg_temp.esperar_error('adoptantes: no se puede borrar un adoptante con solicitudes', '23503',
  $q$ delete from adoptantes where id = pg_temp.id('adoptante_1') $q$);
select pg_temp.esperar_error('usuarios: no se puede borrar un usuario con registros a su nombre', '23503',
  $q$ delete from usuarios where id = pg_temp.id('u_veterinario') $q$);

-- -----------------------------------------------------------------------------
-- 6. Datos calculados
-- -----------------------------------------------------------------------------
select pg_temp.verificar('edad: 2024-01-15 → 2026-10-22 son 33 meses',
  fn_edad_en_meses('2024-01-15', '2026-10-22') = 33);
select pg_temp.verificar('edad: sin fecha de nacimiento la edad es NULL',
  fn_edad_en_meses(null) is null);
select pg_temp.verificar('v_perros: muestra raza, tamaño y estado legibles',
  (select raza = 'Mestizo' and tamano_nombre = 'Pequeño' and estado_nombre = 'En tratamiento'
     from v_perros where id = pg_temp.id('pruebab')));

-- -----------------------------------------------------------------------------
-- 7. Permisos
-- -----------------------------------------------------------------------------
select pg_temp.verificar('permisos: RLS activado en las 10 tablas',
  (select count(*) = 10 from pg_class
    where relnamespace = 'public'::regnamespace and relrowsecurity
      and relname in ('tamanos', 'estados_perro', 'estados_solicitud', 'razas', 'usuarios', 'perros', 'adoptantes', 'solicitudes_adopcion', 'consultas', 'vacunas')));

do $$
declare
  v_rol   text;
  v_tabla text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = v_rol) then
      raise notice 'OK  permisos: el rol % no existe en esta base (PostgreSQL local)', v_rol;
      continue;
    end if;
    foreach v_tabla in array array['tamanos', 'estados_perro', 'estados_solicitud', 'razas', 'usuarios', 'perros', 'adoptantes', 'solicitudes_adopcion', 'consultas', 'vacunas', 'v_perros'] loop
      if has_table_privilege(v_rol, v_tabla, 'select, insert, update, delete') then
        raise exception 'FALLÓ: permisos: el rol % todavía tiene acceso a %', v_rol, v_tabla;
      end if;
    end loop;
    raise notice 'OK  permisos: el rol % no tiene acceso a ninguna tabla', v_rol;
  end loop;
end;
$$;

do $$ begin raise notice '== Todas las verificaciones pasaron =='; end $$;

rollback;
