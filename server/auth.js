// احراز هویت با نام کاربری و رمز عبور (بدون کتابخونه‌ی جدید؛ فقط crypto خود Node)
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { db } from './db.js'
import { parseCookies } from './session.js'

const scrypt = promisify(crypto.scrypt)

export const AUTH_COOKIE = 'songmore_auth'
const SESSION_DAYS = 30
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

// محدودیت تلاش ناموفق برای ورود (جلوی حدس زدن رمز رو می‌گیره)
const MAX_FAILED_LOGINS = 10
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000

// ---------- اعتبارسنجی ----------

// ۳ تا ۲۰ کاراکتر: حروف انگلیسی، عدد یا _
export function isValidUsername(username) {
  return typeof username === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(username)
}

// حداقل ۸ و حداکثر ۱۲۸ کاراکتر
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128
}

// ---------- هش رمز ----------

// خروجی: scrypt$<salt>$<hash> (هر دو base64)
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [algo, saltB64, hashB64] = String(stored).split('$')
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length)
  // مقایسه‌ی زمان‌ثابت تا از روی زمان جواب نشه چیزی فهمید
  return crypto.timingSafeEqual(actual, expected)
}

// وقتی نام کاربری وجود نداره هم یه هش حساب می‌کنیم تا زمان جواب با حالت
// «رمز اشتباه» یکی باشه و نشه فهمید چه نام‌هایی ثبت شدن
let dummyHashPromise = null
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword('dummy-password-for-timing')
  return dummyHashPromise
}

// ---------- کاربرها ----------

function publicUser(row) {
  return { id: row.id, username: row.username }
}

// کاربر جدید می‌سازه؛ اگه نام کاربری تکراری باشه خطای USERNAME_TAKEN می‌ده
export async function createUser(username, password) {
  const passwordHash = await hashPassword(password)
  try {
    const info = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username, passwordHash)
    return { id: Number(info.lastInsertRowid), username }
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new Error('USERNAME_TAKEN')
    throw e
  }
}

// اگه نام کاربری و رمز درست باشن کاربر رو برمی‌گردونه، وگرنه null
export async function authenticate(username, password) {
  const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username)
  if (!row) {
    await verifyPassword(password, await getDummyHash())
    return null
  }
  const ok = await verifyPassword(password, row.password_hash)
  return ok ? publicUser(row) : null
}

// ---------- نشست ورود ----------

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// یه توکن تصادفی می‌سازه؛ فقط هشش توی دیتابیس می‌ره
export function createAuthSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    Date.now() + SESSION_MS
  )
  return token
}

export function getUserByToken(token) {
  if (!token) return null
  const row = db
    .prepare(
      `SELECT u.id, u.username, s.expires_at FROM auth_sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
    )
    .get(hashToken(token))
  if (!row) return null
  if (row.expires_at < Date.now()) {
    deleteAuthSession(token)
    return null
  }
  return publicUser(row)
}

export function deleteAuthSession(token) {
  if (!token) return
  db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashToken(token))
}

export function getAuthToken(req) {
  return parseCookies(req.headers.cookie)[AUTH_COOKIE] || null
}

// ---------- کوکی ----------

function cookieFlags() {
  // Secure فقط روی سرور واقعی (https)؛ لوکال http هست و کوکی Secure اونجا کار نمی‌کنه
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `HttpOnly; Path=/; SameSite=Lax${secure}`
}

export function setAuthCookie(res, token) {
  res.append('Set-Cookie', `${AUTH_COOKIE}=${token}; ${cookieFlags()}; Max-Age=${SESSION_MS / 1000}`)
}

export function clearAuthCookie(res) {
  res.append('Set-Cookie', `${AUTH_COOKIE}=; ${cookieFlags()}; Max-Age=0`)
}

// ---------- محدودیت تلاش ناموفق ----------

const failedLogins = new Map() // ip -> { count, firstAt }

export function isLoginBlocked(ip) {
  const entry = failedLogins.get(ip)
  if (!entry) return false
  if (Date.now() - entry.firstAt > FAILED_LOGIN_WINDOW_MS) {
    failedLogins.delete(ip)
    return false
  }
  return entry.count >= MAX_FAILED_LOGINS
}

export function recordFailedLogin(ip) {
  const entry = failedLogins.get(ip)
  if (!entry || Date.now() - entry.firstAt > FAILED_LOGIN_WINDOW_MS) {
    failedLogins.set(ip, { count: 1, firstAt: Date.now() })
  } else {
    entry.count += 1
  }
}

export function clearFailedLogins(ip) {
  failedLogins.delete(ip)
}
