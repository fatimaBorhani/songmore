// تست حروف واژه‌یاب: کیبورد، تبدیل کلید به حرف فارسی، رنگ کلیدها و متن اشتراک
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KEY_ROWS, LETTERS, isUnknownCharacterKey, letterFromKeyEvent, letterStatuses, shareText } from '../src/games/word/letters.js'

// یه رویداد کیبورد ساده
const key = (k, code = '', shiftKey = false) => ({ key: k, code, shiftKey })

test('کیبورد ۳۴ حرف یکتا داره، شامل «آ» و «ئ»', () => {
  assert.equal(KEY_ROWS.flat().length, 34)
  assert.equal(LETTERS.size, 34)
  assert.ok(LETTERS.has('آ') && LETTERS.has('ئ') && LETTERS.has('ا'))
  assert.equal(LETTERS.has('ي'), false) // ي عربی حرف جدا نیست
})

test('وقتی زبان سیستم فارسیه، خود حرف برمی‌گرده', () => {
  assert.equal(letterFromKeyEvent(key('ش', 'KeyA')), 'ش')
  assert.equal(letterFromKeyEvent(key('آ', 'KeyH', true)), 'آ')
})

test('شکل‌های عربی حروف به فارسی تبدیل می‌شن', () => {
  assert.equal(letterFromKeyEvent(key('ي', 'KeyD')), 'ی')
  assert.equal(letterFromKeyEvent(key('ك', 'Semicolon')), 'ک')
  assert.equal(letterFromKeyEvent(key('ة')), 'ه')
  assert.equal(letterFromKeyEvent(key('أ')), 'ا')
})

test('وقتی زبان سیستم انگلیسیه، حرف از جای کلید پیدا می‌شه', () => {
  assert.equal(letterFromKeyEvent(key('a', 'KeyA')), 'ش')
  assert.equal(letterFromKeyEvent(key('Q', 'KeyQ')), 'ض')
  assert.equal(letterFromKeyEvent(key(',', 'Comma')), 'و')
  assert.equal(letterFromKeyEvent(key('h', 'KeyH')), 'ا')
})

test('Shift+H می‌شه «آ» و Shift+C می‌شه «ژ»', () => {
  assert.equal(letterFromKeyEvent(key('H', 'KeyH', true)), 'آ')
  assert.equal(letterFromKeyEvent(key('C', 'KeyC', true)), 'ژ')
  assert.equal(letterFromKeyEvent(key('c', 'KeyC')), 'ز')
})

test('کلید IME (Process) هم از جای کلید خونده می‌شه', () => {
  assert.equal(letterFromKeyEvent(key('Process', 'KeyA')), 'ش')
})

test('کلیدهای غیرحرف (Enter، Backspace، فلش، عدد) حرف نمی‌دن', () => {
  for (const k of ['Enter', 'Backspace', 'ArrowLeft', 'Shift', 'Tab']) {
    assert.equal(letterFromKeyEvent(key(k, k)), null)
    assert.equal(isUnknownCharacterKey(key(k, k)), false)
  }
  assert.equal(letterFromKeyEvent(key('5', 'Digit5')), null)
})

test('عدد و علامت «کلید ناشناخته» حساب می‌شن ولی فاصله و Process نه', () => {
  assert.equal(isUnknownCharacterKey(key('5', 'Digit5')), true)
  assert.equal(isUnknownCharacterKey(key('?', 'Slash')), true)
  assert.equal(isUnknownCharacterKey(key(' ', 'Space')), false)
  assert.equal(isUnknownCharacterKey(key('Process', 'KeyA')), false)
})

test('رنگ هر کلید بهترین نتیجه‌ایه که اون حرف تا الان گرفته', () => {
  const guesses = [
    { letters: [{ letter: 'ب', result: 'absent' }, { letter: 'ا', result: 'present' }, { letter: 'ر', result: 'present' }] },
    { letters: [{ letter: 'ا', result: 'correct' }, { letter: 'ر', result: 'absent' }, { letter: 'د', result: 'absent' }] },
  ]
  assert.deepEqual(letterStatuses(guesses), { ب: 'absent', ا: 'correct', ر: 'present', د: 'absent' })
  assert.deepEqual(letterStatuses([]), {})
})

test('متن اشتراک: تیتر هر کلمه، مربع‌ها، X برای باخت و هیچ حرفی لو نمی‌ره', () => {
  const game = {
    slots: [
      { length: 3, won: true, guessCount: 2, maxGuesses: 6, rows: [['absent', 'present', 'correct'], ['correct', 'correct', 'correct']] },
      // باخت با ادامه: ۸ ردیف داره ولی فقط ۶ تای اول توی اشتراک میاد
      { length: 4, won: false, guessCount: 8, maxGuesses: 6, rows: Array.from({ length: 8 }, () => ['absent', 'absent', 'absent', 'absent']) },
    ],
  }
  const lines = shareText(game, 'واژه‌یاب 12').split('\n')
  assert.equal(lines[0], 'واژه‌یاب ۱۲')
  assert.equal(lines[1], '‏۳ حرفی ۲/۶')
  assert.equal(lines[2], '‏⬛🟨🟩')
  assert.equal(lines[3], '‏🟩🟩🟩')
  assert.equal(lines[4], '‏۴ حرفی X/۶')
  assert.equal(lines.length, 5 + 6) // ۶ ردیف، نه ۸
  assert.equal(/[آ-ی]/.test(lines.slice(2, 4).join('')), false)
})
