// ارتباط با سرور بازی
const API_URL = 'http://localhost:3001'

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
