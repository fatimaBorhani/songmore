// API بازی حدس آهنگ (همه زیر /api/song روی سرور)
import { API_URL, call, postJson } from '../../shared/api.js'

export function getGame() {
  return call('/api/song/game')
}

export function searchSongs(query) {
  return call(`/api/song/search?q=${encodeURIComponent(query)}`)
}

export function sendGuess(songId, label) {
  return postJson('/api/song/guess', { songId, label })
}

export function sendSkip() {
  return postJson('/api/song/skip')
}

export function clipUrl(fileName) {
  return `${API_URL}/clips/${fileName}`
}

// آمار کاربر واردشده از سرور (روی همه‌ی دستگاه‌ها یکیه)
export async function fetchMyStats() {
  const data = await call('/api/song/stats')
  return data.stats
}

// جدول امتیاز امروز
export function getTodayLeaderboard() {
  return call('/api/song/leaderboard/today')
}

// اطلاعات صفحه‌ی حساب کاربری (آمار، فعالیت تقویم، رتبه‌ی امروز)؛ فقط برای کاربر واردشده
export function getProfile() {
  return call('/api/song/profile')
}
