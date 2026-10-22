import type { EstadoAdopcion, EstadoPerro } from '@/api/tipos'
import { ESTILO_ESTADO_ADOPCION, ESTILO_ESTADO_PERRO } from '@/shared/utils/estilos'

type Props =
  | { tipo: 'perro'; estado: EstadoPerro; nombre: string }
  | { tipo: 'adopcion'; estado: EstadoAdopcion; nombre: string }

export default function InsigniaEstado(props: Props) {
  const estilo = props.tipo === 'perro' ? ESTILO_ESTADO_PERRO[props.estado] : ESTILO_ESTADO_ADOPCION[props.estado]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${estilo}`}>
      {props.nombre}
    </span>
  )
}
