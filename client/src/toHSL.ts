export function toHSL(str: string) {
  if (!str) return
  const opts = {
    hue: [60, 360],
    sat: [75, 100],
    lum: [70, 71],
  }

  function range(hash: number, min: number, max: number) {
    const diff = max - min
    const x = ((hash % diff) + diff) % diff
    return x + min
  }

  let hash = 0

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }

  let h = range(hash, opts.hue[0], opts.hue[1])
  let s = range(hash, opts.sat[0], opts.sat[1])
  let l = range(hash, opts.lum[0], opts.lum[1])

  return `hsl(${h}, ${s}%, ${l}%)`
}
