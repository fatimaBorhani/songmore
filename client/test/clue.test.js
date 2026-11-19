// تست کمک‌های «کلمه‌ی پنهان»: گرمای رتبه، متن رتبه، ترتیب لیست و متن اشتراک
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heatOf, rankLabel, shareText, sortGuesses } from '../src/games/clue/clue.js'

test('heatOf: داغ تا ۵۰، ولرم تا ۳۰۰، بقیه و «دور» سرد', () => {
  assert.equal(heatOf(1), 'hot')
  assert.equal(heatOf(50), 'hot')
  assert.equal(heatOf(51), 'warm')
  assert.equal(heatOf(300), 'warm')
  assert.equal(heatOf(301), 'cold')
  assert.equal(heatOf(null), 'cold')
})

test('rankLabel: عدد فارسی یا «دور»', () => {
  assert.equal(rankLabel(12), '۱۲')
  assert.equal(rankLabel(null), 'دور')
})

test('sortGuesses: نزدیک‌ترین اول، «دور»ها آخر به ترتیب زده شدن، آرایه‌ی اصلی دست نمی‌خوره', () => {
  const guesses = [
    { number: 1, rank: null },
    { number: 2, rank: 40 },
    { number: 3, rank: 7 },
    { number: 4, rank: null },
    { number: 5, rank: 300 },
  ]
  assert.deepEqual(sortGuesses(guesses).map((g) => g.number), [3, 2, 5, 1, 4])
  assert.deepEqual(guesses.map((g) => g.number), [1, 2, 3, 4, 5])
})

test('shareText: جواب لو نمی‌ره، هر حدس یه مربع و راهنما لامپ', () => {
  const game = {
    found: true,
    guessCount: 3,
    hintCount: 1,
    answer: 'دریا',
    guesses: [
      { number: 1, word: 'کوه', rank: 640, hint: false },
      { number: 2, word: 'آب', rank: 120, hint: false },
      { number: 3, word: 'بندر', rank: 7, hint: true },
      { number: 4, word: 'دریا', rank: 1, hint: false },
    ],
  }
  const text = shareText(game, 'کلمه‌ی پنهان')
  assert.ok(!text.includes('دریا'))
  assert.ok(!text.includes('بندر'))
  assert.ok(text.includes('پیداش کردم با ۳ حدس و ۱ راهنما'))
  assert.ok(text.includes('⬛⬜💡🟦'))
  const gaveUp = shareText({ ...game, found: false, hintCount: 0 }, 'کلمه‌ی پنهان')
  assert.ok(gaveUp.includes('تسلیم شدم بعد از ۳ حدس'))
  assert.ok(!gaveUp.includes('راهنما'))
})

test('shareText: هر ۱۰ حدس یه خط', () => {
  const guesses = Array.from({ length: 23 }, (_, i) => ({ number: i + 1, rank: null, hint: false }))
  const lines = shareText({ found: false, guessCount: 23, hintCount: 0, guesses }, 'ک').split('\n')
  assert.equal(lines.length, 2 + 3)
})
