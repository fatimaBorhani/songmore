// API بازی حافظه‌ی رنگ (همه زیر /api/color روی سرور)
import { call, postJson } from '../../shared/api.js'

export function getColorGame() {
  return call('/api/color/game')
}

// شروع یه دور: رنگی که باید حفظ بشه ({ round, color: {h, s, b} })
export function startColorRound() {
  return postJson('/api/color/start')
}

// رنگی که بازیکن ساخته ({h, s, b})؛ وضعیت بازی با نتیجه‌ی این دور برمی‌گرده
export function sendColorGuess(hsb) {
  return postJson('/api/color/guess', hsb)
}

// آمار حافظه‌ی رنگ برای صفحه‌ی حساب (فقط کاربر واردشده)
export function getColorStats() {
  return call('/api/color/stats')
}
