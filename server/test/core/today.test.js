// تست تاریخ روز به وقت تهران: بازی‌های روزانه دقیقاً نیمه‌شب تهران عوض می‌شن (تهران = UTC+3:30، بدون تغییر ساعت)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTodayDateString } from '../../core/today.js'

test('یه ثانیه قبل از نیمه‌شب تهران هنوز همون روزه', () => {
  // 20:29:59 UTC = 23:59:59 تهران
  assert.equal(getTodayDateString(new Date('2026-11-14T20:29:59Z')), '2026-11-14')
})

test('دقیقاً نیمه‌شب تهران روز بعد شروع می‌شه', () => {
  // 20:30:00 UTC = 00:00:00 تهران (روز بعد)
  assert.equal(getTodayDateString(new Date('2026-11-14T20:30:00Z')), '2026-11-15')
})

test('وقتی UTC رفته روز بعد ولی تهران هم همون روزه، تاریخ تهران حساب می‌شه', () => {
  // 00:10 UTC روز ۱۵ = 03:40 تهران روز ۱۵
  assert.equal(getTodayDateString(new Date('2026-11-15T00:10:00Z')), '2026-11-15')
  // 19:00 UTC روز ۱۴ = 22:30 تهران روز ۱۴
  assert.equal(getTodayDateString(new Date('2026-11-14T19:00:00Z')), '2026-11-14')
})

test('تابستون هم همون +3:30 حساب می‌شه (ایران دیگه ساعت رو جلو نمی‌کشه)', () => {
  assert.equal(getTodayDateString(new Date('2026-07-01T20:29:59Z')), '2026-07-01')
  assert.equal(getTodayDateString(new Date('2026-07-01T20:30:00Z')), '2026-07-02')
})

test('آخر ماه و آخر سال درست رد می‌شه و قالب همیشه YYYY-MM-DD هست', () => {
  assert.equal(getTodayDateString(new Date('2026-12-31T20:30:00Z')), '2027-01-01')
  assert.equal(getTodayDateString(new Date('2027-02-28T20:30:00Z')), '2027-03-01')
  assert.match(getTodayDateString(), /^\d{4}-\d{2}-\d{2}$/)
})
