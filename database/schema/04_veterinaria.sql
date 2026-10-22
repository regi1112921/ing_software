-- =============================================================================
-- 03_veterinaria.sql — Historial médico: consultas y vacunas
-- Dueño: servicio de Veterinaria.
-- El historial médico de un perro = sus consultas + sus vacunas.
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
