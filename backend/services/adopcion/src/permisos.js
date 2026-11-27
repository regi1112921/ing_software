import { ROLES } from '@huellas/shared'

// HU-07: el módulo de adopciones (y los datos del adoptante) es de administración
// y de los responsables de adopciones. Perros y catálogos los ven todos los roles.
export const ROLES_ADOPCIONES = [ROLES.administrador, ROLES.responsableAdopciones]

export const puedeVerAdopciones = (usuario) => ROLES_ADOPCIONES.includes(usuario?.rol)

// HU-14: las historias de adopciones exitosas las publica, edita y oculta la administración.
export const ROLES_HISTORIAS = [ROLES.administrador]
