// منطق بدون صفحه‌ی «شعر یادت نره» (تست‌ها: client/test/lyrics.test.js)
import { faNumber } from '../../shared/format.js'

export const GRADE_LABELS = { ok: 'درست', close: 'نزدیک', wrong: 'غلط' }
export const SHARE_SQUARES = { ok: '🟩', close: '🟨', wrong: '⬛' }
export const MAX_POINTS_PER_SONG = 4

// خطی که الان داره خونده می‌شه (آخرین خطی که زمانش رسیده)، یا -1
export function currentLineIndex(lines, nowMs) {
  let current = -1
  lines.forEach((line, i) => {
    if (line.ms <= nowMs) current = i
  })
  return current
}

// کلاس هر خط مثل اسپاتیفای: خونده‌شده کم‌رنگ، جاری پررنگ، بعدی کم‌رنگ‌تر
export function lineState(index, current, isAnswer) {
  if (current >= 0) return index < current ? 'past' : index === current ? 'cur' : 'next'
  return isAnswer ? 'ans' : 'past'
}

// «۱:۰۵» از میلی‌ثانیه
export function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return faNumber(m) + ':' + s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
}

// یه جمله‌ی کوتاه برای امتیاز یه آهنگ (از ۴)
export function songVerdict(points) {
  if (points >= 4) return 'هر دو خط رو مو به مو یادت بود!'
  if (points >= 2) return 'نزدیک بودی، دمت گرم!'
  if (points === 1) return 'یه چیزایی یادت بود!'
  return 'این یکی پرید؛ فردا جبران کن!'
}

// یه جمله برای امتیاز کل روز
export function dayVerdict(points, max) {
  if (max > 0 && points === max) return 'همه رو از حفظی، استاد!'
  if (points >= max * 0.6) return 'بیشترشو یادت بود، ایول!'
  if (points > 0) return 'گوشت با آهنگاست، فقط یه کم تمرین!'
  return 'امروز روز تو نبود؛ فردا دوباره!'
}

// متن «کپی نتیجه»: فقط مربع‌ها و امتیاز، بدون هیچ متنی از ترانه‌ها
export function shareText(game, title) {
  const rows = game.slots
    .filter((s) => s.finished)
    .map((s) => `${s.grades.map((g) => SHARE_SQUARES[g]).join('')} ${faNumber(s.points)}`)
  return `${title}\n${rows.join('\n')}\nامتیاز: ${faNumber(game.dayPoints)} از ${faNumber(game.maxPoints)}`
}
