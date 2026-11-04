// تست احراز هویت: هش رمز، اعتبارسنجی، و کل روند ثبت‌نام / ورود / خروج از طریق API
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../db.js')
const { hashPassword, verifyPassword, isValidUsername, isValidPassword } = await import('../auth.js')
const { app } = await import('../index.js')

let server
let baseUrl

before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
})

// کوکی ورود رو از جواب سرور درمیاره (اگه بود)
function getAuthCookie(res) {
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('songmore_auth='))
  return cookie ? cookie.split(';')[0] : null
}

function post(path, body, cookie) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body ?? {}),
  })
}

async function me(cookie) {
  const res = await fetch(`${baseUrl}/api/auth/me`, { headers: cookie ? { Cookie: cookie } : {} })
  return (await res.json()).user
}

// ---------- تست‌های واحد ----------

test('هش رمز: رمز درست تأیید می‌شه، رمز غلط نه، و هر بار salt جدید', async () => {
  const hash1 = await hashPassword('secret-pass-1')
  const hash2 = await hashPassword('secret-pass-1')
  assert.match(hash1, /^scrypt\$[^$]+\$[^$]+$/)
  assert.notEqual(hash1, hash2) // salt تصادفی
  assert.equal(hash1.includes('secret-pass-1'), false)
  assert.equal(await verifyPassword('secret-pass-1', hash1), true)
  assert.equal(await verifyPassword('secret-pass-2', hash1), false)
  assert.equal(await verifyPassword('secret-pass-1', 'not-a-hash'), false)
})

test('اعتبارسنجی نام کاربری و رمز', () => {
  assert.equal(isValidUsername('fatima_99'), true)
  assert.equal(isValidUsername('ab'), false) // کوتاه
  assert.equal(isValidUsername('a'.repeat(21)), false) // بلند
  assert.equal(isValidUsername('فاطیما'), false) // فقط انگلیسی، عدد و _
  assert.equal(isValidUsername('bad name'), false)
  assert.equal(isValidUsername(123), false)

  assert.equal(isValidPassword('12345678'), true)
  assert.equal(isValidPassword('1234567'), false) // کمتر از ۸
  assert.equal(isValidPassword('x'.repeat(129)), false)
  assert.equal(isValidPassword(undefined), false)
})

// ---------- تست‌های API ----------

test('بدون ورود، /me کاربری برنمی‌گردونه', async () => {
  assert.equal(await me(), null)
})

test('ثبت‌نام: حساب ساخته می‌شه، کوکی ورود میاد و /me کاربر رو می‌شناسه', async () => {
  const res = await post('/api/auth/signup', { username: 'Fatima', password: 'pass-1234' })
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.user.username, 'Fatima')
  assert.equal('password_hash' in body.user, false)

  const cookie = getAuthCookie(res)
  assert.ok(cookie, 'باید کوکی ورود بده')
  const raw = res.headers.getSetCookie().find((c) => c.startsWith('songmore_auth='))
  assert.match(raw, /HttpOnly/)
  assert.match(raw, /SameSite=Lax/)

  assert.equal((await me(cookie)).username, 'Fatima')
})

test('رمز به شکل خام توی دیتابیس ذخیره نمی‌شه، توکن هم نه', async () => {
  const res = await post('/api/auth/signup', { username: 'hashcheck', password: 'my-plain-pass' })
  const token = getAuthCookie(res).split('=')[1]
  const user = db.prepare("SELECT password_hash FROM users WHERE username = 'hashcheck'").get()
  assert.equal(user.password_hash.includes('my-plain-pass'), false)
  const sessions = db.prepare('SELECT token_hash FROM auth_sessions').all()
  assert.equal(sessions.some((s) => s.token_hash === token), false)
})

test('ثبت‌نام: نام کاربری تکراری (حتی با حروف بزرگ و کوچیک دیگه) رد می‌شه', async () => {
  const res = await post('/api/auth/signup', { username: 'fATIMA', password: 'another-pass' })
  assert.equal(res.status, 409)
  assert.equal((await res.json()).error, 'USERNAME_TAKEN')
})

test('ثبت‌نام: نام کاربری یا رمز نامعتبر رد می‌شه', async () => {
  let res = await post('/api/auth/signup', { username: 'ab', password: 'pass-1234' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'INVALID_USERNAME')

  res = await post('/api/auth/signup', { username: 'shortpass', password: '123' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'WEAK_PASSWORD')

  res = await post('/api/auth/signup', {})
  assert.equal(res.status, 400)
})

test('ورود: رمز غلط و کاربر ناموجود هر دو همون خطا رو می‌دن', async () => {
  let res = await post('/api/auth/login', { username: 'Fatima', password: 'wrong-pass' })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).error, 'INVALID_CREDENTIALS')
  assert.equal(getAuthCookie(res), null)

  res = await post('/api/auth/login', { username: 'nobody_here', password: 'whatever1' })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).error, 'INVALID_CREDENTIALS')
})

test('ورود: با رمز درست (و نام کاربری با حروف دیگه) وارد می‌شه', async () => {
  const res = await post('/api/auth/login', { username: 'fatima', password: 'pass-1234' })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.user.username, 'Fatima')
  const cookie = getAuthCookie(res)
  assert.equal((await me(cookie)).username, 'Fatima')
})

test('خروج: نشست پاک می‌شه و همون کوکی دیگه کار نمی‌کنه', async () => {
  const login = await post('/api/auth/login', { username: 'Fatima', password: 'pass-1234' })
  const cookie = getAuthCookie(login)
  assert.ok(await me(cookie))

  const res = await post('/api/auth/logout', {}, cookie)
  assert.equal(res.status, 200)
  const cleared = res.headers.getSetCookie().find((c) => c.startsWith('songmore_auth='))
  assert.match(cleared, /Max-Age=0/)

  assert.equal(await me(cookie), null)
})

test('نشست منقضی‌شده قبول نمی‌شه', async () => {
  const login = await post('/api/auth/login', { username: 'Fatima', password: 'pass-1234' })
  const cookie = getAuthCookie(login)
  db.prepare('UPDATE auth_sessions SET expires_at = ?').run(Date.now() - 1000)
  assert.equal(await me(cookie), null)
})

test('توکن ساختگی قبول نمی‌شه', async () => {
  assert.equal(await me('songmore_auth=fake-token-123'), null)
})

test('بازی برای کاربر واردشده هم کار می‌کنه و هر دو کوکی با هم میان', async () => {
  // ثبت‌نام بدون کوکی بازی: جواب باید هم کوکی بازی بده هم کوکی ورود
  const res = await post('/api/auth/signup', { username: 'both_cookies', password: 'pass-1234' })
  const names = res.headers.getSetCookie().map((c) => c.split('=')[0])
  assert.ok(names.includes('songmore_session'))
  assert.ok(names.includes('songmore_auth'))
})

// این تست آخره، چون بعدش ورود از این IP تا ۱۵ دقیقه بسته‌ست
test('بعد از ۱۰ تلاش ناموفق، ورود موقتاً بسته می‌شه (حتی با رمز درست)', async () => {
  for (let i = 0; i < 10; i++) {
    await post('/api/auth/login', { username: 'Fatima', password: `wrong-${i}` })
  }
  const res = await post('/api/auth/login', { username: 'Fatima', password: 'pass-1234' })
  assert.equal(res.status, 429)
  assert.equal((await res.json()).error, 'TOO_MANY_ATTEMPTS')
})
