// شناسه‌ی نشست هر بازیکن، توی یه کوکی ساده (بدون کتابخونه‌ی جدید)
import crypto from 'node:crypto'

const COOKIE_NAME = 'songmore_session'

export function getOrCreateSessionId(req, res) {
  const cookies = parseCookies(req.headers.cookie)
  let sessionId = cookies[COOKIE_NAME]
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    // append (نه setHeader) تا اگه همون جواب کوکی ورود هم داشت، جای هم رو نگیرن
    res.append(
      'Set-Cookie',
      `${COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=31536000`
    )
  }
  return sessionId
}

export function parseCookies(header) {
  const result = {}
  if (!header) return result
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    try {
      result[key] = decodeURIComponent(value)
    } catch {
      // کوکی خراب رو نادیده بگیر، به جای اینکه کل درخواست خطا بده
    }
  }
  return result
}
