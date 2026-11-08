// ریاضی رنگ: HSB -> RGB -> Lab و فاصله‌ی ادراکی (ΔE) بین دو رنگ.
// h: ۰ تا ۳۵۹ (درجه)، s و b: ۰ تا ۱۰۰ (درصد)

// HSB (که توی اسلایدرها می‌بینی) -> RGB با عددهای ۰ تا ۲۵۵
export function hsbToRgb(h, s, b) {
  const S = s / 100
  const V = b / 100
  const sector = (((h % 360) + 360) % 360) / 60
  const c = V * S
  const x = c * (1 - Math.abs((sector % 2) - 1))
  const m = V - c
  let rgb
  if (sector < 1) rgb = [c, x, 0]
  else if (sector < 2) rgb = [x, c, 0]
  else if (sector < 3) rgb = [0, c, x]
  else if (sector < 4) rgb = [0, x, c]
  else if (sector < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return rgb.map((v) => Math.round((v + m) * 255))
}

function srgbToLinear(v) {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

// RGB (sRGB) -> Lab با نور روز D65
export function rgbToLab([r, g, b]) {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116)
  const fx = f(x)
  const fy = f(y)
  const fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

// فاصله‌ی دو رنگ Lab (CIE76): ۰ یعنی یکی، حدود ۲ تا ۳ یعنی چشم فرق رو به‌سختی می‌بینه
export function deltaE(lab1, lab2) {
  return Math.hypot(lab1[0] - lab2[0], lab1[1] - lab2[1], lab1[2] - lab2[2])
}

// فاصله‌ی ادراکی دو رنگ HSB ({h, s, b})
export function colorDistance(a, b) {
  return deltaE(rgbToLab(hsbToRgb(a.h, a.s, a.b)), rgbToLab(hsbToRgb(b.h, b.s, b.b)))
}
