-- =============================================================================
-- 03_veterinaria.sql — Historial médico: consultas, vacunas y desparasitaciones
-- Dueño: servicio de Veterinaria.
-- El historial médico de un perro = sus consultas + sus vacunas + sus desparasitaciones.
-- =============================================================================

-- Verifica que veterinario_id apunte a un usuario activo con rol veterinario.
create or replace function fn_validar_veterinario()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from usuarios
    where id = new.veterinario_id and rol = 'veterinario' and activo
  ) then
    raise exception 'El usuario % no es un veterinario activo.', new.veterinario_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- consultas ("atención médica" en el mockup)
-- -----------------------------------------------------------------------------
create table consultas (
  id             bigint generated always as identity primary key,
  perro_id       bigint      not null references perros (id),
  veterinario_id bigint      not null references usuarios (id),
  fecha          date        not null default current_date,
  motivo         text        not null,
  diagnostico    text        not null,
  tratamiento    text        not null,
  observaciones  text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  -- Permite que vacunas referencie (consulta, perro) y garantizar que sea el mismo perro.
  constraint uq_consultas_id_perro unique (id, perro_id),
  constraint ck_consultas_motivo      check (btrim(motivo) <> ''),
  constraint ck_consultas_diagnostico check (btrim(diagnostico) <> ''),
  constraint ck_consultas_tratamiento check (btrim(tratamiento) <> '')
);

comment on table  consultas is 'Atenciones médicas de un perro. El tratamiento indicado se guarda como texto.';
comment on column consultas.veterinario_id is 'Veterinario responsable de la atención (usuario con rol veterinario).';

create index ix_consultas_perro_fecha on consultas (perro_id, fecha desc);
create index ix_consultas_veterinario on consultas (veterinario_id);

create trigger trg_consultas_actualizado_en
  before update on consultas
  for each row execute function fn_actualizar_timestamp();

create trigger trg_consultas_validar_veterinario
  before insert or update of veterinario_id on consultas
  for each row execute function fn_validar_veterinario();

-- -----------------------------------------------------------------------------
-- vacunas
-- -----------------------------------------------------------------------------
create table vacunas (
  id                  bigint generated always as identity primary key,
  perro_id            bigint      not null references perros (id),
  veterinario_id      bigint      not null references usuarios (id),
  consulta_id         bigint,
  nombre              text        not null,
  fecha_aplicacion    date        not null default current_date,
  fecha_proxima_dosis date,
  observaciones       text,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),

  -- Si la vacuna se aplicó en una consulta, debe ser una consulta del mismo perro.
  constraint fk_vacunas_consulta_mismo_perro
    foreign key (consulta_id, perro_id) references consultas (id, perro_id),
  constraint ck_vacunas_nombre check (btrim(nombre) <> ''),
  constraint ck_vacunas_proxima_dosis check (fecha_proxima_dosis is null or fecha_proxima_dosis > fecha_aplicacion)
);

comment on table  vacunas is 'Vacunas aplicadas a un perro y fecha de la próxima dosis.';
comment on column vacunas.consulta_id is 'Opcional: consulta en la que se aplicó la vacuna.';

create index ix_vacunas_perro_fecha   on vacunas (perro_id, fecha_aplicacion desc);
create index ix_vacunas_proxima_dosis on vacunas (fecha_proxima_dosis) where fecha_proxima_dosis is not null;
create index ix_vacunas_consulta      on vacunas (consulta_id) where consulta_id is not null;
create index ix_vacunas_veterinario   on vacunas (veterinario_id);

create trigger trg_vacunas_actualizado_en
  before update on vacunas
  for each row execute function fn_actualizar_timestamp();

create trigger trg_vacunas_validar_veterinario
  before insert or update of veterinario_id on vacunas
  for each row execute function fn_validar_veterinario();

-- -----------------------------------------------------------------------------
-- desparasitaciones (HU-08)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- citas (HU-11: agenda de citas veterinarias)
-- -----------------------------------------------------------------------------
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
