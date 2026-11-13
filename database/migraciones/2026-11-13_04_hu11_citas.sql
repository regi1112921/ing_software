-- =============================================================================
-- 2026-11-13_04_hu11_citas.sql — HU-11: Agenda de citas veterinarias
--
-- Se ejecuta UNA sola vez sobre una base que ya tiene 2026-11-11_03_hu10_seguimientos.sql.
-- Las instalaciones nuevas no la necesitan: schema/ ya incluye estos cambios.
--
--   1. Tabla citas (perro, veterinario, fecha, hora en bloques de 30 minutos, tipo y
--      motivo). Estados: programada → atendida (enlaza la consulta creada en el
--      historial) o cancelada.
--   2. Índice único parcial: dos citas vigentes no pueden ocupar la misma fecha y hora.
-- =============================================================================

begin;

-- Una cita se agenda en bloques de 30 minutos (09:00, 09:30, …). No puede haber dos
-- citas vigentes (programadas o atendidas) en la misma fecha y hora: la cancelada
-- libera el horario. Al atenderla se crea la consulta en el historial y se enlaza aquí.
create table citas (
  id                 bigint generated always as identity primary key,
  perro_id           bigint      not null references perros (id),
  veterinario_id     bigint      not null references usuarios (id),
  fecha              date        not null,
  hora               time(0)     not null,
  tipo               text        not null,
  motivo             text        not null,
  estado             text        not null default 'programada',
  motivo_cancelacion text,
  consulta_id        bigint,
  registrado_por     bigint      not null references usuarios (id),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  constraint fk_citas_consulta_mismo_perro
    foreign key (consulta_id, perro_id) references consultas (id, perro_id),
  constraint uq_citas_consulta    unique (consulta_id),
  constraint ck_citas_tipo        check (tipo in ('consulta', 'vacuna', 'cirugia')),
  constraint ck_citas_estado      check (estado in ('programada', 'atendida', 'cancelada')),
  constraint ck_citas_hora        check (extract(minute from hora) in (0, 30) and extract(second from hora) = 0),
  constraint ck_citas_motivo      check (btrim(motivo) <> '' and length(motivo) <= 200),
  constraint ck_citas_atendida    check ((estado = 'atendida') = (consulta_id is not null)),
  constraint ck_citas_cancelacion check (estado = 'cancelada' or motivo_cancelacion is null)
);

comment on table  citas is 'HU-11: citas veterinarias (consulta, vacuna o cirugía) agendadas en bloques de 30 minutos.';
comment on column citas.estado is 'programada → atendida (con consulta en el historial) o cancelada (libera el horario).';
comment on column citas.consulta_id is 'Consulta del historial médico creada al atender la cita.';

-- Dos citas vigentes no pueden ocupar la misma fecha y hora.
create unique index uq_citas_horario on citas (fecha, hora) where estado <> 'cancelada';
create index ix_citas_perro          on citas (perro_id, fecha desc);
create index ix_citas_veterinario    on citas (veterinario_id, fecha);
create index ix_citas_registrado_por on citas (registrado_por);

create trigger trg_citas_actualizado_en
  before update on citas
  for each row execute function fn_actualizar_timestamp();

create trigger trg_citas_validar_veterinario
  before insert or update of veterinario_id on citas
  for each row execute function fn_validar_veterinario();

-- Igual que el resto: sin acceso desde la Data API de Supabase.
alter table citas enable row level security;

do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on citas from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
    end if;
  end loop;
end;
$$;

commit;
