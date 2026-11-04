// ارتباط با سرور بازی
// هاست رو از آدرس خود صفحه می‌گیریم (نه همیشه localhost ثابت)، چون کوکی نشست
// بین هاست‌های متفاوت (مثلاً 127.0.0.1 در مقابل localhost) رد و بدل نمی‌شه
// و بازی هی از نو شروع می‌شد. اینجوری چه از localhost باز کنی چه از IP روی وای‌فای کار می‌کنه.
const API_URL = `http://${window.location.hostname}:3001`

async function call(path, options) {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `خطای سرور (${res.status})`)
  }
  return res.json()
}

export function getGame() {
  return call('/api/game')
}

export function searchSongs(query) {
  return call(`/api/search?q=${encodeURIComponent(query)}`)
}

export function sendGuess(songId, label) {
  return call('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId, label }),
  })
}

export function sendSkip() {
  return call('/api/skip', { method: 'POST' })
}

export function clipUrl(fileName) {
  return `${API_URL}/clips/${fileName}`
}

// ---------- احراز هویت ----------

function postJson(path, body) {
  return call(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
}

// کاربر واردشده رو برمی‌گردونه، یا null
export async function getMe() {
  const data = await call('/api/auth/me')
  return data.user
}

export async function signup(username, password) {
  const data = await postJson('/api/auth/signup', { username, password })
  return data.user
}

export async function login(username, password) {
  const data = await postJson('/api/auth/login', { username, password })
  return data.user
}

export function logout() {
  return postJson('/api/auth/logout')
}

// آمار کاربر واردشده از سرور (روی همه‌ی دستگاه‌ها یکیه)
export async function fetchMyStats() {
  const data = await call('/api/stats')
  return data.stats
}

// جدول امتیاز امروز
export function getTodayLeaderboard() {
  return call('/api/leaderboard/today')
}
