// ریاضی رنگ: HSB -> RGB -> Lab و فاصله‌ی ادراکی (ΔE) بین دو رنگ (CIE76 و CIEDE2000).
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

const rad = (deg) => (deg * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI
const POW25_7 = 25 ** 7

// فاصله‌ی دو رنگ Lab با فرمول CIEDE2000 (دقیق‌تر از CIE76، همونی که dialed.gg استفاده می‌کنه)
export function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const avgL = (L1 + L2) / 2
  const c7 = ((Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2) ** 7
  const g = 0.5 * (1 - Math.sqrt(c7 / (c7 + POW25_7)))
  const a1p = a1 * (1 + g)
  const a2p = a2 * (1 + g)
  const c1 = Math.hypot(a1p, b1)
  const c2 = Math.hypot(a2p, b2)
  const avgC = (c1 + c2) / 2
  const dC = c2 - c1
  let h1 = deg(Math.atan2(b1, a1p))
  if (h1 < 0) h1 += 360
  let h2 = deg(Math.atan2(b2, a2p))
  if (h2 < 0) h2 += 360

  // اختلاف و میانگین رنگ‌مایه روی دایره
  let dh = h2 - h1
  if (Math.abs(dh) > 180) dh += h2 <= h1 ? 360 : -360
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2))
  let avgH = (h1 + h2) / 2
  if (Math.abs(h1 - h2) > 180) avgH += h1 + h2 < 360 ? 180 : -180

  const t =
    1 -
    0.17 * Math.cos(rad(avgH - 30)) +
    0.24 * Math.cos(rad(2 * avgH)) +
    0.32 * Math.cos(rad(3 * avgH + 6)) -
    0.2 * Math.cos(rad(4 * avgH - 63))
  const sL = 1 + (0.015 * (avgL - 50) ** 2) / Math.sqrt(20 + (avgL - 50) ** 2)
  const sC = 1 + 0.045 * avgC
  const sH = 1 + 0.015 * avgC * t
  const avgC7 = avgC ** 7
  const rT = -2 * Math.sqrt(avgC7 / (avgC7 + POW25_7)) * Math.sin(rad(60 * Math.exp(-(((avgH - 275) / 25) ** 2))))

  const l = (L2 - L1) / sL
  const c = dC / sC
  const h = dH / sH
  return Math.sqrt(l * l + c * c + h * h + rT * c * h)
}

// فاصله‌ی CIEDE2000 دو رنگ HSB
export function colorDistance2000(a, b) {
  return deltaE2000(rgbToLab(hsbToRgb(a.h, a.s, a.b)), rgbToLab(hsbToRgb(b.h, b.s, b.b)))
}
