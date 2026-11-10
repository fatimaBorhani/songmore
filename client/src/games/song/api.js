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

// نمایش جواب (فقط وقتی رد کردن‌ها تموم شده)
export function sendGiveUp() {
  return postJson('/api/song/giveup')
}

// فقط حالت تست (npm run dev): ۳ آهنگ تصادفی جدید برای امروز و پاک شدن حدس‌های امروز
export function resetTestGame() {
  return postJson('/api/song/test/reset')
}

export function clipUrl(fileName) {
  return `${API_URL}/clips/${fileName}`
}

// جدول امتیاز امروز
export function getTodayLeaderboard() {
  return call('/api/song/leaderboard/today')
}

// اطلاعات صفحه‌ی حساب کاربری (آمار، فعالیت تقویم، رتبه‌ی امروز)؛ فقط برای کاربر واردشده
export function getProfile() {
  return call('/api/song/profile')
}

// ---------- حالت تمرینی (نامحدود، بدون امتیاز) ----------

export function getPracticeGame() {
  return call('/api/song/practice/game')
}

export function sendPracticeGuess(songId, label) {
  return postJson('/api/song/practice/guess', { songId, label })
}

export function sendPracticeSkip() {
  return postJson('/api/song/practice/skip')
}

export function sendPracticeGiveUp() {
  return postJson('/api/song/practice/giveup')
}

// بازی تمرینی بعدی (فقط وقتی بازی فعلی تموم شده)
export function nextPracticeGame() {
  return postJson('/api/song/practice/next')
}
