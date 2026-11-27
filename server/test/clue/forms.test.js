// تست forms.txt: شکل‌های یه کلمه (جمع و ...) جای جدا توی رتبه‌ها نمی‌گیرن و رتبه‌ی کلمه‌ی اصلی رو می‌گیرن
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { useClueFixture } from './fixture.js'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

// داده‌ی کوچیک تست + یه forms.txt (یه خط خراب و یه خط با کلمه‌ی ناموجود هم داره که باید نادیده گرفته بشن)
const dir = useClueFixture()
fs.writeFileSync(
  path.join(dir, 'forms.txt'),
  ['کتاب‌ها\tکتاب', 'کتب\tکتاب', 'خط-خراب-بدون-تب', 'نیستان\tنیست', 'اقیانوس\tدریا'].join('\n') + '\n'
)

const { ranksFor } = await import('../../games/clue/words.js')
const { normalizeWord } = await import('../../games/word/letters.js')
const rank = (answer, word) => ranksFor(normalizeWord(answer)).byWord.get(normalizeWord(word))

test('شکل‌ها توی لیست رتبه‌ها جای جدا نمی‌گیرن', () => {
  const { list } = ranksFor(normalizeWord('کتاب'))
  // ۲۷ کلمه منهای ۳ شکل (کتاب‌ها، کتب، اقیانوس)
  assert.equal(list.length, 24)
  assert.deepEqual(list.slice(0, 4), ['کتاب', 'کتابی', 'رمان', 'جلد'])
  assert.equal(list.includes('کتاب‌ها'), false)
})

test('شکلِ خود جواب رتبه‌ی ۲ می‌گیره (۱ فقط خود جوابه)', () => {
  assert.equal(rank('کتاب', 'کتاب'), 1)
  assert.equal(rank('کتاب', 'کتاب‌ها'), 2)
  assert.equal(rank('کتاب', 'کتب'), 2)
  assert.equal(rank('کتاب', 'کتابی'), 2)
  assert.equal(rank('کتاب', 'رمان'), 3)
})

test('شکلِ کلمه‌های دیگه همون رتبه‌ی کلمه‌ی اصلی‌شون رو دارن', () => {
  assert.equal(rank('دریا', 'کتاب‌ها'), rank('دریا', 'کتاب'))
  assert.equal(rank('کوه', 'کتب'), rank('کوه', 'کتاب'))
  assert.equal(rank('دریا', 'اقیانوس'), 2) // شکلِ خود جواب
})
