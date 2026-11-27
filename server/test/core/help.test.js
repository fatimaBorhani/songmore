// تست راهنمای بازی‌ها: هر حساب راهنمای کدوم بازی رو دیده (GET /api/help و POST /api/help/seen)
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { app } = await import('../../index.js')

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

function post(path, body, cookie) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body ?? {}),
  })
}

function get(path, cookie) {
  return fetch(`${baseUrl}${path}`, { headers: cookie ? { Cookie: cookie } : {} })
}

// یه حساب تازه می‌سازه و کوکی ورودش رو برمی‌گردونه
async function signup(username) {
  const res = await post('/api/auth/signup', { username, password: 'password123' })
  assert.equal(res.status, 201)
  return res.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
}

test('مهمان: هر دو API خطای 401 می‌دن', async () => {
  assert.equal((await get('/api/help')).status, 401)
  assert.equal((await post('/api/help/seen', { game: 'word' })).status, 401)
})

test('حساب تازه هیچ راهنمایی ندیده؛ بعد از ثبت، دیده‌شده‌ها برمی‌گردن', async () => {
  const cookie = await signup('helper1')
  assert.deepEqual(await (await get('/api/help', cookie)).json(), { seen: [] })

  assert.equal((await post('/api/help/seen', { game: 'word' }, cookie)).status, 200)
  assert.equal((await post('/api/help/seen', { game: 'clue' }, cookie)).status, 200)
  // دوباره زدن خطا نیست و تکراری ذخیره نمی‌شه
  assert.equal((await post('/api/help/seen', { game: 'word' }, cookie)).status, 200)

  assert.deepEqual(await (await get('/api/help', cookie)).json(), { seen: ['clue', 'word'] })
})

test('بازی ناشناخته INVALID_GAME می‌ده', async () => {
  const cookie = await signup('helper2')
  for (const game of ['chess', '', undefined, 12]) {
    const res = await post('/api/help/seen', { game }, cookie)
    assert.equal(res.status, 400)
    assert.equal((await res.json()).error, 'INVALID_GAME')
  }
})

test('دیده‌شده‌های هر حساب جداست', async () => {
  const a = await signup('helper3')
  const b = await signup('helper4')
  await post('/api/help/seen', { game: 'song' }, a)
  assert.deepEqual(await (await get('/api/help', a)).json(), { seen: ['song'] })
  assert.deepEqual(await (await get('/api/help', b)).json(), { seen: [] })
})
