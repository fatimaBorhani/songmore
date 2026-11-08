// کمک‌ها برای حافظه‌ی رنگ: تبدیل HSB به رنگ CSS، رنگ خوانا روی هر زمینه، متن‌ها و اشتراک
import { faDigits, faNumber } from '../../shared/format.js'

// رنگ اولیه‌ی اسلایدرها (وسط‌های هر مقیاس)
export const INITIAL_HSB = { h: 180, s: 50, b: 50 }

// HSB -> RGB (۰ تا ۲۵۵)؛ همون فرمول سروره (server/games/color/colorMath.js)
export function hsbToRgb({ h, s, b }) {
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

export function hsbToCss(hsb) {
  const [r, g, b] = hsbToRgb(hsb)
  return `rgb(${r}, ${g}, ${b})`
}

// نور نسبی یه رنگ (WCAG) برای انتخاب رنگ متن
function luminance([r, g, b]) {
  const lin = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// روی این رنگ، متن مشکی بنویسیم یا سفید؟ هر کدوم که خواناتره
export function readableOn(hsb) {
  const L = luminance(hsbToRgb(hsb))
  const contrastWithBlack = (L + 0.05) / 0.05
  const contrastWithWhite = 1.05 / (L + 0.05)
  return contrastWithBlack >= contrastWithWhite ? '#09090B' : '#FFFFFF'
}

// زمینه‌ی گرادیانت هر اسلایدر؛ رنگ‌مایه همیشه رنگین‌کمان کامله، اشباع و روشنی با رنگ فعلی ساخته می‌شن
export function sliderTracks({ h, s, b }) {
  const rainbow = [0, 60, 120, 180, 240, 300, 360].map((x) => hsbToCss({ h: x, s: 100, b: 100 })).join(', ')
  return {
    h: `linear-gradient(to right, ${rainbow})`,
    s: `linear-gradient(to right, ${hsbToCss({ h, s: 0, b })}, ${hsbToCss({ h, s: 100, b })})`,
    b: `linear-gradient(to right, ${hsbToCss({ h, s, b: 0 })}, ${hsbToCss({ h, s, b: 100 })})`,
  }
}

// امتیاز با رقم فارسی: ۱۰ یا ۸٫۴
export function faScore(n) {
  return faNumber(n, Number.isInteger(n) ? 0 : 1)
}

// «رنگ‌مایه ۶° کم»: اختلاف رنگ تو با رنگ اصلی (منفی یعنی رنگ تو کمتر بوده)
function diffText(label, value, unit) {
  if (value === 0) return `${label} درست`
  return `${label} ${faNumber(Math.abs(value))}${unit} ${value < 0 ? 'کم' : 'زیاد'}`
}

export function diffChips(diff) {
  return [diffText('رنگ‌مایه', diff.h, '°'), diffText('اشباع', diff.s, '٪'), diffText('روشنی', diff.b, '٪')]
}

// متن اشتراک نتیجه‌ی بازی، بدون لو دادن رنگ‌ها
export function shareText(game, title) {
  const scores = game.rounds.map((r) => faScore(r.score)).join(' · ')
  return faDigits(`${title} ${faScore(game.total)}/${game.maxTotal}`) + `\n${scores}`
}
