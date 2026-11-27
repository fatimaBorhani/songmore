// نمره‌ی هر خط: متن بازیکن چقدر شبیه خط واقعیه؟
// فاصله، نیم‌فاصله، اعراب، علامت‌ها و ي/ك عربی مهم نیستن (normalizePersian).
// شباهت = ۱ − (فاصله‌ی ویرایشی ÷ طول بلندتر). ۸۰٪ به بالا «درست»، ۵۰٪ به بالا «نزدیک».
import { normalizePersian } from '../../core/normalize.js'

export const OK_SIMILARITY = 0.8
export const CLOSE_SIMILARITY = 0.5
export const POINTS = { ok: 2, close: 1, wrong: 0 }
export const MAX_POINTS_PER_SONG = POINTS.ok * 2

// فاصله‌ی ویرایشی (چند حرف باید عوض/اضافه/حذف بشه)
export function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    }
    prev = cur
  }
  return prev[b.length]
}

export function similarity(typed, real) {
  const a = [...normalizePersian(typed)]
  const b = [...normalizePersian(real)]
  if (a.length === 0) return 0
  return 1 - editDistance(a, b) / Math.max(a.length, b.length, 1)
}

// 'ok' | 'close' | 'wrong'
export function gradeLine(typed, real) {
  const sim = similarity(typed, real)
  if (sim >= OK_SIMILARITY) return 'ok'
  if (sim >= CLOSE_SIMILARITY) return 'close'
  return 'wrong'
}
