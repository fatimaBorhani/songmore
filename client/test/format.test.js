// تست قالب‌بندی عددها با رقم فارسی
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { faDigits, faNumber, faSeconds } from '../src/shared/format.js'

test('faDigits رقم‌های انگلیسی رو فارسی می‌کنه و بقیه‌ی متن رو دست نمی‌زنه', () => {
  assert.equal(faDigits('08:12:40'), '۰۸:۱۲:۴۰')
  assert.equal(faDigits('3 حرفی 4/6'), '۳ حرفی ۴/۶')
  assert.equal(faDigits(2026), '۲۰۲۶')
  assert.equal(faDigits('بدون عدد'), 'بدون عدد')
})

test('faNumber عدد رو با رقم فارسی و جداکننده‌ی هزارگان می‌نویسه', () => {
  assert.equal(faNumber(0), '۰')
  assert.equal(faNumber(7), '۷')
  assert.equal(faNumber(10000), '۱۰٬۰۰۰')
  assert.equal(faNumber(9.817, 2), '۹٫۸۲')
  assert.equal(faNumber(8.4, 2), '۸٫۴۰')
})

test('faSeconds زیر یه ثانیه دو رقم اعشار داره و بقیه بدون اعشار', () => {
  assert.equal(faSeconds(0.15), '۰٫۱۵')
  assert.equal(faSeconds(0.5), '۰٫۵۰')
  assert.equal(faSeconds(2), '۲')
  assert.equal(faSeconds(15), '۱۵')
})
