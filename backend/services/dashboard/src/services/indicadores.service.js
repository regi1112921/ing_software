import { campos, solicitudInvalida, validar, z } from '@huellas/shared'

// Meses que muestra el gráfico de adopciones (incluido el actual).
const MESES_GRAFICO = 12

const esquemaReporte = z.object({
  tipo: z.enum(['perros', 'adopciones', 'atenciones'], { error: 'El tipo debe ser perros, adopciones o atenciones.' }),
  formato: z.enum(['pdf', 'excel'], { error: 'El formato debe ser pdf o excel.' }),
  desde: campos.fecha('La fecha inicial').optional(),
  hasta: campos.fecha('La fecha final').optional(),
})

function csv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return /[",;\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

function generarExcel(reporte) {
  const filas = [reporte.columnas, ...reporte.filas].map((fila) => fila.map(csv).join(','))
  return `\ufeff${filas.join('\r\n')}`
}

function escaparPdf(texto) {
  return texto.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function generarPdf(reporte) {
  const lineas = [reporte.columnas.join(' | '), ...reporte.filas.map((fila) => fila.join(' | '))]
  const stream = `BT\n/F1 9 Tf\n50 800 Td\n11 TL\n${lineas.map((linea) => `(${escaparPdf(linea.slice(0, 120))}) Tj\nT*`).join('\n')}\nET`
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objetos.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'))
    pdf += `${i + 1} 0 obj\n${objetos[i]}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdf, 'ascii')
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf, 'ascii')
}

export function crearIndicadoresService({ indicadores }) {
  return {
    async reporte(datos) {
      const consulta = validar(esquemaReporte, datos)
      if (consulta.desde && consulta.hasta && consulta.desde > consulta.hasta) {
        throw solicitudInvalida('La fecha inicial no puede ser posterior a la fecha final.')
      }
      const reporte = await indicadores.reporte(consulta.tipo, consulta.desde, consulta.hasta)
      return consulta.formato === 'excel'
        ? { contenido: Buffer.from(generarExcel(reporte), 'utf8'), tipo: 'text/csv; charset=utf-8', nombre: `${consulta.tipo}.csv` }
        : { contenido: generarPdf(reporte), tipo: 'application/pdf', nombre: `${consulta.tipo}.pdf` }
    },
    // HU-13 · RF-03: total, cantidad por cada estado (también los que tienen 0)
    // y los indicadores principales de la administración.
    async resumen() {
      const [porEstado, solicitudes] = await Promise.all([indicadores.conteoPorEstado(), indicadores.conteoSolicitudes()])
      const total = porEstado.reduce((suma, estado) => suma + estado.cantidad, 0)
      const cantidad = (codigo) => porEstado.find((estado) => estado.codigo === codigo)?.cantidad ?? 0
      return {
        total,
        por_estado: porEstado,
        indicadores: {
          // Los adoptados ya no están en el albergue.
          en_albergue: total - cantidad('adoptado'),
          disponibles: cantidad('disponible'),
          en_tratamiento: cantidad('en_tratamiento'),
          adopciones_mes: solicitudes.adopciones_mes,
          solicitudes_pendientes: solicitudes.pendientes,
        },
      }
    },

    // HU-14 · RF-04: del ingreso más antiguo al más reciente.
    async perrosEnTratamiento() {
      const perros = await indicadores.perrosEnTratamiento()
      return { total: perros.length, perros }
    },

    // HU-13: adopciones finalizadas por mes, del más antiguo al actual (también los meses con 0).
    async adopcionesPorMes() {
      return { meses: await indicadores.adopcionesPorMes(MESES_GRAFICO) }
    },
  }
}
