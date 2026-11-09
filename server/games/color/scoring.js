// امتیازدهی حافظه‌ی رنگ: هر دور از ۱۰، هر چه رنگ تو به رنگ اصلی نزدیک‌تر، امتیاز بیشتر.
// همه‌ی حساب‌ها روی سروره (رنگ اصلی تا بعد از ثبت حدس به کلاینت داده نمی‌شه).
import { colorDistance2000 } from './colorMath.js'

export const ROUNDS = 5 // تعداد دور هر بازی
export const MAX_ROUND_SCORE = 10
export const MEMORIZE_SECONDS = 5 // چند ثانیه رنگ رو می‌بینی

// امتیاز یه دور (۰ تا ۱۰ با دو رقم اعشار)، همون فرمول dialed.gg/color:
// ۱) پایه از فاصله‌ی CIEDE2000: ۱۰ / (۱ + (ΔE/۲۵٫۲۵)^۱٫۵۵)  -> ΔE=۵: حدود ۹٫۲، ۱۰: ۸٫۱، ۲۵: ۵، ۵۰: ۲٫۶
// ۲) جایزه: اگه رنگ‌مایه کمتر از ۲۵ درجه فرق داره (و رنگ خیلی خاکستری نیست)، تا یه چهارم فاصله تا ۱۰ اضافه می‌شه
// ۳) جریمه: اگه رنگ‌مایه بیشتر از ۳۰ درجه فرق داره، تا ۱۵٪ امتیاز کم می‌شه
// ۴) لرزش کوچیک ±۰٫۰۴ (مثل dialed) تا امتیازها خیلی گرد و تکراری نباشن؛ بالای ۹٫۸ لرزش نداره
export function scoreColor(target, guess) {
  const distance = colorDistance2000(target, guess)
  const base = MAX_ROUND_SCORE / (1 + (distance / 25.25) ** 1.55)
  const hue = Math.abs(hueDiff(target.h, guess.h))
  const avgSat = (target.s + guess.s) / 2
  const bonus = (MAX_ROUND_SCORE - base) * Math.max(0, 1 - (hue / 25) ** 1.5) * Math.min(1, avgSat / 30) * 0.25
  const penalty = base * Math.max(0, (hue - 30) / 150) * Math.min(1, avgSat / 40) * 0.15
  const score = base + bonus - penalty
  return Math.max(0, Math.min(MAX_ROUND_SCORE, Math.round((score + jitter(score, target, guess)) * 100) / 100))
}

// لرزش «تصادفی» ولی ثابت: از روی خود دو رنگ ساخته می‌شه (هش FNV-1a)،
// پس برای یه جفت رنگ همیشه یکیه (مثل dialed.gg)
function jitter(score, target, guess) {
  if (score >= 9.8) return 0
  const text = `${target.h}|${target.s}|${target.b}|${guess.h}|${guess.s}|${guess.b}`
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return ((hash >>> 0) / 0xffffffff - 0.5) * 0.08
}

// اختلاف رنگ‌مایه‌ی تو با رنگ اصلی: کوتاه‌ترین مسیر روی دایره، بین -۱۸۰ تا ۱۸۰
// (منفی یعنی رنگ‌مایه‌ی تو کمتر بوده). مثلاً از ۳۵۰ تا ۱۰ می‌شه +۲۰
export function hueDiff(target, guess) {
  const d = (((guess - target) % 360) + 540) % 360 - 180
  return d === -180 ? 180 : d
}

// نتیجه‌ی یه دور: رنگ اصلی، رنگ تو، فاصله، امتیاز و اختلاف هر مولفه
export function evaluateRound(target, guess, round) {
  const distance = colorDistance2000(target, guess)
  return {
    round,
    target: { h: target.h, s: target.s, b: target.b },
    guess: { h: guess.h, s: guess.s, b: guess.b },
    deltaE: Math.round(distance * 10) / 10,
    score: scoreColor(target, guess),
    diff: {
      h: hueDiff(target.h, guess.h),
      s: guess.s - target.s,
      b: guess.b - target.b,
    },
  }
}
