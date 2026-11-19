// API بازی «کلمه‌ی پنهان» (همه زیر /api/clue روی سرور)
import { call, postJson } from '../../shared/api.js'

export function getClueGame() {
  return call('/api/clue/game')
}

export function sendClueGuess(word) {
  return postJson('/api/clue/guess', { word })
}

// یه کلمه‌ی نزدیک‌تر از بهترین حدس به لیست اضافه می‌کنه (خود جواب هیچ‌وقت نه)
export function sendClueHint() {
  return postJson('/api/clue/hint')
}

// تسلیم: جواب نشون داده می‌شه و بازی باخت حساب می‌شه
export function sendClueGiveUp() {
  return postJson('/api/clue/giveup')
}

// آمار کلمه‌ی پنهان برای صفحه‌ی حساب (فقط کاربر واردشده)
export function getClueStats() {
  return call('/api/clue/stats')
}

// فقط حالت تست (npm run dev): کلمه‌ی تصادفی جدید برای امروز
export function resetClueTest() {
  return postJson('/api/clue/test/reset')
}
