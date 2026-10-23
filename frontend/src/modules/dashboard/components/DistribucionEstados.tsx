import type { Resumen } from '@/api/tipos'
import { COLOR_ESTADO_PERRO, TARJETA } from '@/shared/utils/estilos'

export default function DistribucionEstados({ resumen }: { resumen: Resumen }) {
  return (
    <section aria-labelledby="titulo-distribucion">
      <h2 id="titulo-distribucion" className="font-bold text-gray-800 mb-3">
        Distribución por estado
      </h2>
      <div className={`${TARJETA} p-5 space-y-4`}>
        {resumen.por_estado.map((estado) => {
          const porcentaje = resumen.total > 0 ? Math.round((estado.cantidad / resumen.total) * 100) : 0
          return (
            <div key={estado.codigo}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 font-medium">{estado.nombre}</span>
                <span className="font-bold text-gray-900">
                  {estado.cantidad}
                  <span className="text-gray-400 font-medium"> · {porcentaje}%</span>
                </span>
              </div>
              <div
                className="h-2 bg-gray-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-label={estado.nombre}
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full transition-all ${COLOR_ESTADO_PERRO[estado.codigo]?.barra ?? 'bg-gray-400'}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
