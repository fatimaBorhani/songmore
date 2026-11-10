// تست یکسان‌سازی و اعتبارسنجی کلمه‌ها
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LETTERS, normalizeWord, validateWord } from '../../games/word/letters.js'
import { answerWords, validWords } from '../../games/word/wordLists.js'

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

test('فقط کلمه‌های لیست قبولن', () => {
  assert.equal(validateWord('پرنده', 5), null)
  assert.equal(validateWord('دست', 3), null)
  assert.equal(validateWord('کتاب', 4), null)
  assert.equal(validateWord('ضصثقف', 5), 'NOT_IN_LIST')
  assert.equal(validateWord('ضصث', 3), 'NOT_IN_LIST')
})

test('طول اشتباه یا حرف غیرفارسی رد می‌شه', () => {
  assert.equal(validateWord('پرند', 5), 'WORD_LENGTH')
  assert.equal(validateWord('دست', 5), 'WORD_LENGTH')
  assert.equal(validateWord('پرندهها', 5), 'WORD_LENGTH')
  assert.equal(validateWord('abcde', 5), 'INVALID_LETTERS')
  assert.equal(validateWord('پرن۲ه', 5), 'INVALID_LETTERS')
})

test('لیست‌ها: جواب‌ها همه حدس مجازن و حروفشون از ۳۴ حرف بازیه', () => {
  for (const length of [3, 4, 5]) {
    const answers = answerWords(length)
    assert.ok(answers.length >= 300, `جواب‌های ${length} حرفی کمه`)
    const valid = validWords(length)
    for (const word of answers) {
      assert.ok(valid.has(word), word)
      assert.equal(Array.from(word).length, length, word)
      assert.ok(Array.from(word).every((ch) => LETTERS.has(ch)), word)
    }
  }
})

test('فایل لیست با پایان خط ویندوزی (\\r\\n) هم درست خونده می‌شه', async () => {
  const fs = await import('node:fs')
  const dir = new URL('../../games/word/words/', import.meta.url)
  const original = fs.readFileSync(new URL('valid_3.txt', dir), 'utf8')
  try {
    fs.writeFileSync(new URL('valid_3.txt', dir), original.replace(/\n/g, '\r\n'))
    // یه پردازش جدید با فایل \r\n تا کش ماژول دخالت نکنه
    const { execFileSync } = await import('node:child_process')
    const out = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', "import { validWords } from './games/word/wordLists.js'; console.log(validWords(3).has('دست'))"],
      { cwd: new URL('../../', import.meta.url), encoding: 'utf8' }
    )
    assert.equal(out.trim(), 'true')
  } finally {
    fs.writeFileSync(new URL('valid_3.txt', dir), original)
  }
})
