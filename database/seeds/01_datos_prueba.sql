-- =============================================================================
-- 01_datos_prueba.sql — Datos ficticios para desarrollo
--
-- Basados en los datos de ejemplo del mockup. Todas las personas son ficticias;
-- las direcciones y teléfonos son de La Paz, Bolivia. Fotos de dog.ceo (Stanford Dogs), elegidas
-- para que coincidan con la raza, el color y el tamaño de cada perro.
-- Se ejecuta sobre una base recién creada (sin datos).
--
-- Los usuarios se crean SIN contraseña (password_hash = NULL): no pueden
-- iniciar sesión hasta que se les asigne una. Ver database/README.md.
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from usuarios) or exists (select 1 from perros) then
    raise exception 'La base ya tiene datos. Los datos de prueba solo se cargan sobre una base vacía.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Usuarios
-- -----------------------------------------------------------------------------
insert into usuarios (nombre_completo, correo, rol) values
  ('Patricia Gómez',  'admin@peluchin.test',          'administrador'),
  ('Andrés Ramírez',  'andres.ramirez@peluchin.test', 'veterinario'),
  ('Lucía Torres',    'lucia.torres@peluchin.test',   'veterinario'),
  ('María Alvarado',  'maria.alvarado@peluchin.test', 'personal');

-- -----------------------------------------------------------------------------
-- Perros (ingresan como disponibles o en tratamiento; los estados de adopción
-- se asignan solos al registrar las solicitudes más abajo)
-- -----------------------------------------------------------------------------
insert into perros
  (nombre, sexo, raza_id, color, tamano, fecha_nacimiento, fecha_nacimiento_estimada, fecha_ingreso, estado, foto_url, registrado_por)
select v.nombre, v.sexo, r.id, v.color, v.tamano, v.nacimiento::date, v.estimada, v.ingreso::date, v.estado, v.foto, u.id
from (values
  ('Luna',   'hembra', 'Labrador Retriever', 'Dorado',         'grande',  '2021-03-15', false, '2023-11-10', 'disponible',
   'https://images.dog.ceo/breeds/labrador/n02099712_3988.jpg'),
  ('Max',    'macho',  'Border Collie',      'Negro y blanco', 'mediano', '2020-07-22', false, '2023-09-05', 'en_tratamiento',
   'https://images.dog.ceo/breeds/collie-border/n02106166_2477.jpg'),
  ('Bella',  'hembra', 'Beagle',             'Tricolor',       'pequeno', '2022-01-10', false, '2024-01-20', 'disponible',
   'https://images.dog.ceo/breeds/beagle/n02088364_2019.jpg'),
  ('Rocky',  'macho',  'Pastor Alemán',      'Negro y café',   'grande',  '2019-06-05', false, '2023-05-14', 'disponible',
   'https://images.dog.ceo/breeds/german-shepherd/n02106662_6966.jpg'),
  ('Coco',   'macho',  'Chihuahua',          'Café claro',     'pequeno', '2023-02-28', false, '2024-03-01', 'disponible',
   'https://images.dog.ceo/breeds/chihuahua/n02085620_3681.jpg'),
  ('Nina',   'hembra', 'Poodle',             'Blanco',         'mediano', '2020-11-12', false, '2024-02-15', 'en_tratamiento',
   'https://images.dog.ceo/breeds/poodle-miniature/n02113712_7666.jpg'),
  -- Edad aproximada: llegó con "unos 2 años"
  ('Toby',   'macho',  'Mestizo',            'Marrón',         'mediano', '2022-04-01', true,  '2024-04-02', 'disponible',
   'https://images.dog.ceo/breeds/mix/lincoln.jpg'),
  -- Edad desconocida y sin foto (muestra el marcador de "sin foto")
  ('Canela', 'hembra', 'Mestizo',            'Canela',         'pequeno', null,         false, '2024-05-10', 'disponible', null)
) as v(nombre, sexo, raza, color, tamano, nacimiento, estimada, ingreso, estado, foto)
join razas r on r.nombre = v.raza
cross join (select id from usuarios where correo = 'maria.alvarado@peluchin.test') u;

-- -----------------------------------------------------------------------------
-- Adoptantes
-- -----------------------------------------------------------------------------
insert into adoptantes (nombre_completo, documento_identidad, telefono, direccion, registrado_por)
select v.nombre, v.documento, v.telefono, v.direccion, u.id
from (values
  ('Carlos Mendoza Vargas', '4875123',    '71234567',   'Av. 6 de Agosto #2170, Sopocachi, La Paz'),
  ('Ana García López',      '6012478',    '76543210',   'Calle 21 de Calacoto #8250, Zona Sur, La Paz'),
  ('Jorge Pérez Ruiz',      null,         '68812345',   'Av. Buenos Aires #1045, Max Paredes, La Paz')
) as v(nombre, documento, telefono, direccion)
cross join (select id from usuarios where correo = 'maria.alvarado@peluchin.test') u;

-- -----------------------------------------------------------------------------
-- Solicitudes de adopción (se recorre el flujo real con INSERT + UPDATE)
-- -----------------------------------------------------------------------------

-- Rocky → Ana: en_proceso → aprobada → finalizada (Rocky queda adoptado)
insert into solicitudes_adopcion (perro_id, adoptante_id, fecha_solicitud, observaciones, registrado_por)
values (
  (select id from perros where nombre = 'Rocky'),
  (select id from adoptantes where documento_identidad = '6012478'),
  '2023-11-20',
  'Adoptante evaluada positivamente. Condiciones del hogar adecuadas para perros de talla grande. Visita domiciliaria aprobada.',
  (select id from usuarios where correo = 'maria.alvarado@peluchin.test')
);
update solicitudes_adopcion set estado = 'aprobada', fecha_aprobacion = '2023-12-05'
 where perro_id = (select id from perros where nombre = 'Rocky');
update solicitudes_adopcion set estado = 'finalizada', fecha_adopcion = '2023-12-15'
 where perro_id = (select id from perros where nombre = 'Rocky');

-- Luna → Jorge: en_proceso → rechazada (Luna vuelve a disponible)
insert into solicitudes_adopcion (perro_id, adoptante_id, fecha_solicitud, registrado_por)
values (
  (select id from perros where nombre = 'Luna'),
  (select id from adoptantes where telefono = '68812345'),
  '2024-02-01',
  (select id from usuarios where correo = 'maria.alvarado@peluchin.test')
);
update solicitudes_adopcion
   set estado = 'rechazada', fecha_rechazo = '2024-02-10',
       observaciones = 'La vivienda no tiene espacio adecuado para un perro grande.'
 where perro_id = (select id from perros where nombre = 'Luna');

-- Bella → Carlos: en_proceso (Bella queda en adopción)
insert into solicitudes_adopcion (perro_id, adoptante_id, fecha_solicitud, observaciones, registrado_por)
values (
  (select id from perros where nombre = 'Bella'),
  (select id from adoptantes where documento_identidad = '4875123'),
  '2024-03-01',
  'Familia con casa propia y jardín amplio. Sin otros animales. Experiencia previa con perros de raza similar.',
  (select id from usuarios where correo = 'maria.alvarado@peluchin.test')
);

-- -----------------------------------------------------------------------------
-- Consultas
-- -----------------------------------------------------------------------------
insert into consultas (perro_id, veterinario_id, fecha, motivo, diagnostico, tratamiento, observaciones)
select p.id, u.id, v.fecha::date, v.motivo, v.diagnostico, v.tratamiento, v.observaciones
from (values
  ('Max',   'andres.ramirez@peluchin.test', '2024-03-15', 'Revisión general',
   'Infección cutánea bacteriana (dermatitis)',
   'Amoxicilina 500mg cada 12h por 10 días + champú medicado semanal',
   'Lesiones evidentes en lomo y cuello. Iniciar tratamiento de forma inmediata.'),
  ('Max',   'andres.ramirez@peluchin.test', '2024-03-22', 'Seguimiento de tratamiento',
   'Dermatitis crónica con mejora moderada',
   'Continuar con antibióticos tópicos y baños medicados cada 3 días',
   'El animal muestra mejoría en las áreas afectadas. Continuar con el plan de tratamiento.'),
  ('Nina',  'lucia.torres@peluchin.test',   '2024-02-28', 'Tos persistente y pérdida de apetito',
   'Bronquitis leve',
   'Reposo, broncodilatador y antiinflamatorio por 7 días',
   'Mejorar ventilación en el área de alojamiento. Seguimiento en 10 días.'),
  ('Luna',  'andres.ramirez@peluchin.test', '2024-01-05', 'Vacunación anual',
   'Animal sano',
   'Vacuna múltiple + antiparasitario oral y externo',
   'Sin observaciones. Animal en excelente estado general.'),
  ('Bella', 'lucia.torres@peluchin.test',   '2024-02-10', 'Chequeo previo a proceso de adopción',
   'Animal sano, apta para adopción',
   'Desparasitación interna y externa preventiva',
   'Todos los parámetros dentro de lo normal. Lista para iniciar proceso de adopción.')
) as v(perro, veterinario, fecha, motivo, diagnostico, tratamiento, observaciones)
join perros   p on p.nombre = v.perro
join usuarios u on u.correo = v.veterinario;

-- -----------------------------------------------------------------------------
-- Vacunas (algunas aplicadas en una consulta, otras no)
-- -----------------------------------------------------------------------------
insert into vacunas (perro_id, veterinario_id, consulta_id, nombre, fecha_aplicacion, fecha_proxima_dosis)
select p.id, u.id, c.id, v.nombre, v.aplicacion::date, v.proxima::date
from (values
  ('Luna',  'andres.ramirez@peluchin.test', true,  'Múltiple (DHPPi+L)', '2024-01-05', '2025-01-05'),
  ('Luna',  'andres.ramirez@peluchin.test', true,  'Antirrábica',        '2024-01-05', '2025-01-05'),
  ('Bella', 'lucia.torres@peluchin.test',   true,  'Antirrábica',        '2024-02-10', '2025-02-10'),
  ('Coco',  'lucia.torres@peluchin.test',   false, 'Múltiple (DHPPi+L)', '2024-03-05', '2024-03-26'),
  ('Toby',  'andres.ramirez@peluchin.test', false, 'Antirrábica',        '2025-11-01', '2026-11-01'),
  ('Max',   'andres.ramirez@peluchin.test', false, 'Antirrábica',        '2024-03-15', null)
) as v(perro, veterinario, en_consulta, nombre, aplicacion, proxima)
join perros   p on p.nombre = v.perro
join usuarios u on u.correo = v.veterinario
left join consultas c on v.en_consulta and c.perro_id = p.id and c.fecha = v.aplicacion::date;

commit;
