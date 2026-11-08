// امتیازدهی حافظه‌ی رنگ: هر دور از ۱۰، هر چه رنگ تو به رنگ اصلی نزدیک‌تر، امتیاز بیشتر.
// همه‌ی حساب‌ها روی سروره (رنگ اصلی تا بعد از ثبت حدس به کلاینت داده نمی‌شه).
import { colorDistance } from './colorMath.js'

export const ROUNDS = 5 // تعداد دور هر بازی
export const MAX_ROUND_SCORE = 10
export const MEMORIZE_SECONDS = 5 // چند ثانیه رنگ رو می‌بینی

// امتیاز از روی فاصله‌ی ΔE: ۰ -> ۱۰، حدود ۵ -> ۸٫۲، ۱۰ -> ۶٫۷، ۲۰ -> ۴٫۵، ۵۰ -> ۱٫۴
// یه رقم اعشار
export function scoreFromDeltaE(distance) {
  const score = MAX_ROUND_SCORE * Math.exp(-distance / 25)
  return Math.round(score * 10) / 10
}

// اختلاف رنگ‌مایه‌ی تو با رنگ اصلی: کوتاه‌ترین مسیر روی دایره، بین -۱۸۰ تا ۱۸۰
// (منفی یعنی رنگ‌مایه‌ی تو کمتر بوده). مثلاً از ۳۵۰ تا ۱۰ می‌شه +۲۰
export function hueDiff(target, guess) {
  const d = (((guess - target) % 360) + 540) % 360 - 180
  return d === -180 ? 180 : d
}

// نتیجه‌ی یه دور: رنگ اصلی، رنگ تو، فاصله، امتیاز و اختلاف هر مولفه
export function evaluateRound(target, guess, round) {
  const distance = colorDistance(target, guess)
  return {
    round,
    target: { h: target.h, s: target.s, b: target.b },
    guess: { h: guess.h, s: guess.s, b: guess.b },
    deltaE: Math.round(distance * 10) / 10,
    score: scoreFromDeltaE(distance),
    diff: {
      h: hueDiff(target.h, guess.h),
      s: guess.s - target.s,
      b: guess.b - target.b,
    },
  }
}
