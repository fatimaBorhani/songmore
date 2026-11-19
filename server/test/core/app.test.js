// تست چیزهای مشترک خود اپ: سلامت، CORS، آدرس ناموجود و خطاها (همیشه JSON، بدون لو دادن جزئیات)
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
const { useClueFixture } = await import('../clue/fixture.js')
useClueFixture() // داده‌ی کوچیک «کلمه‌ی پنهان» به‌جای فایل‌های واقعی

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

test('GET /api/health جواب می‌ده', async () => {
  const res = await fetch(`${baseUrl}/api/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
})

test('پیش‌درخواست CORS (OPTIONS) بدون بدنه 204 می‌ده و سربرگ‌های لازم رو داره', async () => {
  const res = await fetch(`${baseUrl}/api/song/guess`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://127.0.0.1:5173' },
  })
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173')
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
  assert.ok(res.headers.get('access-control-allow-methods').includes('POST'))
})

test('آدرس API ناموجود 404 با JSON می‌ده (نه صفحه‌ی HTML)', async () => {
  for (const method of ['GET', 'POST']) {
    const res = await fetch(`${baseUrl}/api/nothing/here`, { method })
    assert.equal(res.status, 404)
    assert.ok(res.headers.get('content-type').includes('application/json'))
    assert.deepEqual(await res.json(), { error: 'NOT_FOUND' })
  }
})

test('بدنه‌ی JSON خراب 400 با INVALID_JSON می‌ده و چیزی از داخل سرور لو نمی‌ره', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"username": "a", ',
  })
  assert.equal(res.status, 400)
  const text = await res.text()
  assert.deepEqual(JSON.parse(text), { error: 'INVALID_JSON' })
  assert.equal(text.includes('node_modules'), false) // مسیر فایل یا stack نباید بیاد
  assert.equal(text.includes('SyntaxError'), false)
})

test('بدنه‌ی خیلی بزرگ 413 می‌ده', async () => {
  const res = await fetch(`${baseUrl}/api/survey/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'ا'.repeat(200_000) }),
  })
  assert.equal(res.status, 413)
  assert.deepEqual(await res.json(), { error: 'TOO_LARGE' })
})

test('درخواست POST بدون بدنه سرور رو از کار نمی‌ندازه', async () => {
  for (const path of ['/api/auth/login', '/api/auth/signup', '/api/word/guess', '/api/word/suggest', '/api/color/guess', '/api/survey/answer', '/api/survey/skip', '/api/survey/suggest', '/api/clue/guess']) {
    const res = await fetch(`${baseUrl}${path}`, { method: 'POST' })
    assert.ok(res.status >= 400 && res.status < 500, `${path} باید خطای 4xx بده، نه ${res.status}`)
    assert.ok((await res.json()).error, `${path} باید کد خطا بده`)
  }
})
