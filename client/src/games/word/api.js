// API بازی واژه‌یاب (همه زیر /api/word روی سرور)
import { call, postJson } from '../../shared/api.js'

export function getWordGame() {
  return call('/api/word/game')
}

export function sendWordGuess(word) {
  return postJson('/api/word/guess', { word })
}

// بعد از ۶ حدس غلط: «جواب رو ببینم». کلمه باخت حساب می‌شه و جوابش میاد
export function sendWordGiveUp() {
  return postJson('/api/word/giveup')
}

// فقط حالت تست (npm run dev): ۳ کلمه‌ی تصادفی جدید برای امروز و پاک شدن حدس‌های امروز
export function resetWordTest() {
  return postJson('/api/word/test/reset')
}
