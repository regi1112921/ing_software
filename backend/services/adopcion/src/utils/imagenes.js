// Tipo real de una imagen según sus primeros bytes (no se confía en el Content-Type
// ni en la extensión que manda el navegador). null si no es JPG, PNG ni WebP.
export function detectarImagen(contenido) {
  if (!Buffer.isBuffer(contenido) || contenido.length < 12) return null
  if (contenido[0] === 0xff && contenido[1] === 0xd8 && contenido[2] === 0xff) {
    return { tipo: 'image/jpeg', extension: 'jpg' }
  }
  if (contenido.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { tipo: 'image/png', extension: 'png' }
  }
  if (contenido.toString('ascii', 0, 4) === 'RIFF' && contenido.toString('ascii', 8, 12) === 'WEBP') {
    return { tipo: 'image/webp', extension: 'webp' }
  }
  return null
}
