-- =============================================================================
-- 2026-11-27_05_hu18_donaciones.sql — HU-18: Registro de donaciones recibidas
-- Ejecutar UNA sola vez en una base existente que ya tiene HU-11.
-- No modifica ni suma las donaciones al inventario.
-- =============================================================================

begin;

create table donaciones (
  id             bigint generated always as identity primary key,
  fecha          date          not null default current_date,
  donante        text          not null,
  contacto       text,
  tipo           text          not null,
  monto_bs       numeric(12,2),
  cantidad       numeric(12,2),
  descripcion    text,
  registrado_por bigint        not null references usuarios (id),
  creado_en      timestamptz   not null default now(),
  actualizado_en timestamptz   not null default now(),
  constraint ck_donaciones_donante check (btrim(donante) <> '' and length(donante) <= 150),
  constraint ck_donaciones_contacto check (contacto is null or length(contacto) <= 150),
  constraint ck_donaciones_tipo check (tipo in ('dinero', 'alimento', 'insumos', 'otro')),
  constraint ck_donaciones_detalle check (
    (tipo = 'dinero' and monto_bs is not null and monto_bs > 0 and cantidad is null)
    or
    (tipo <> 'dinero' and monto_bs is null and cantidad is not null and cantidad > 0
      and descripcion is not null and btrim(descripcion) <> '')
  ),
  constraint ck_donaciones_descripcion check (descripcion is null or length(descripcion) <= 500)
);

comment on table donaciones is 'HU-18: donaciones recibidas por el albergue. Solo se registran; no son pagos ni movimientos de inventario.';
comment on column donaciones.monto_bs is 'Monto recibido en bolivianos; solo aplica al tipo dinero.';
comment on column donaciones.cantidad is 'Cantidad recibida para alimentos, insumos u otros artículos.';
comment on column donaciones.descripcion is 'Descripción obligatoria para donaciones que no son dinero.';
create index ix_donaciones_fecha on donaciones (fecha desc, id desc);
create trigger trg_donaciones_actualizado_en
  before update on donaciones for each row execute function fn_actualizar_timestamp();
alter table donaciones enable row level security;

do $$
declare v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on donaciones from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
    end if;
  end loop;
end;
$$;

commit;