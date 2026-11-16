// تست کوکی نشست مرورگر: خوندن کوکی‌ها و ساختن شناسه‌ی تازه
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getOrCreateSessionId, parseCookies } from '../../core/session.js'

// یه res ساده که فقط Set-Cookieها رو نگه می‌داره
function fakeRes() {
  const cookies = []
  return { cookies, append: (name, value) => name === 'Set-Cookie' && cookies.push(value) }
}

test('parseCookies چند کوکی رو جدا می‌کنه و فاصله‌ها رو برمی‌داره', () => {
  assert.deepEqual(parseCookies('a=1; b=two ;c=x=y'), { a: '1', b: 'two', c: 'x=y' })
})

test('parseCookies بدون سربرگ یا با تکه‌ی بدون = خطا نمی‌ده', () => {
  assert.deepEqual(parseCookies(undefined), {})
  assert.deepEqual(parseCookies(''), {})
  assert.deepEqual(parseCookies('junk; a=1'), { a: '1' })
})

test('parseCookies مقدار کدشده رو برمی‌گردونه و کوکی خراب رو نادیده می‌گیره', () => {
  assert.deepEqual(parseCookies('name=%D8%B3%D9%84%D8%A7%D9%85'), { name: 'سلام' })
  // %E0%A4%A یه کد ناقصه؛ نباید کل درخواست رو خراب کنه
  assert.deepEqual(parseCookies('bad=%E0%A4%A; ok=1'), { ok: '1' })
})

test('مرورگر بدون کوکی یه شناسه‌ی تازه و یه کوکی امن می‌گیره', () => {
  const res = fakeRes()
  const id = getOrCreateSessionId({ headers: {} }, res)
  assert.match(id, /^[0-9a-f-]{36}$/)
  assert.equal(res.cookies.length, 1)
  assert.ok(res.cookies[0].startsWith(`songmore_session=${id};`))
  assert.ok(res.cookies[0].includes('HttpOnly')) // جاوااسکریپت صفحه نتونه بخونتش
  assert.ok(res.cookies[0].includes('SameSite=Lax'))
})

test('مرورگری که کوکی داره همون شناسه رو نگه می‌داره و کوکی تازه نمی‌گیره', () => {
  const res = fakeRes()
  const id = getOrCreateSessionId({ headers: { cookie: 'x=1; songmore_session=abc-123' } }, res)
  assert.equal(id, 'abc-123')
  assert.equal(res.cookies.length, 0)
})

test('دو مرورگر جدا شناسه‌ی متفاوت می‌گیرن', () => {
  const a = getOrCreateSessionId({ headers: {} }, fakeRes())
  const b = getOrCreateSessionId({ headers: {} }, fakeRes())
  assert.notEqual(a, b)
})
