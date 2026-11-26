// API بازی «شعر یادت نره» (همه زیر /api/lyrics روی سرور)
import { API_URL, call, postJson } from '../../shared/api.js'

export function getLyricsGame() {
  return call('/api/lyrics/game')
}

// دو خطی که بازیکن نوشته، برای تیکه‌ی جاری (slot)
export function sendLyricsAnswer(slot, line1, line2) {
  return postJson('/api/lyrics/answer', { slot, line1, line2 })
}

// فقط حالت تست (npm run dev): تیکه‌های تازه برای امروز
export function resetLyricsTest() {
  return postJson('/api/lyrics/test/reset')
}

// آدرس کامل کلیپ روی سرور (سرور «/clips/lyrics/...» می‌فرسته)
export function clipAddress(path) {
  return `${API_URL}${path}`
}
