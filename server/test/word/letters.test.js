// تست یکسان‌سازی و اعتبارسنجی کلمه‌ها
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LETTERS, normalizeWord, validateWord } from '../../games/word/letters.js'

test('۳۴ حرف، با آ و ئ', () => {
  assert.equal(LETTERS.size, 34)
  assert.ok(LETTERS.has('آ'))
  assert.ok(LETTERS.has('ئ'))
})

test('ی و ک عربی، نیم‌فاصله و اعراب یکسان می‌شن', () => {
  assert.equal(normalizeWord('كيف'), 'کیف')
  assert.equal(normalizeWord('می‌رود'), 'میرود')
  assert.equal(normalizeWord(' پَرَنده '), 'پرنده')
})

test('کلمه‌ی ۵ حرفی فارسی قبوله، حتی اگه وجود نداشته باشه', () => {
  assert.equal(validateWord('پرنده'), null)
  assert.equal(validateWord('ضصثقف'), null)
})

test('طول اشتباه یا حرف غیرفارسی رد می‌شه', () => {
  assert.equal(validateWord('پرند'), 'WORD_LENGTH')
  assert.equal(validateWord('پرندهها'), 'WORD_LENGTH')
  assert.equal(validateWord('abcde'), 'INVALID_LETTERS')
  assert.equal(validateWord('پرن۲ه'), 'INVALID_LETTERS')
})
