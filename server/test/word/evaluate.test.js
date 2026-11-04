// تست رنگ حرف‌ها، مخصوصاً حروف تکراری
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGuess } from '../../games/word/evaluate.js'

test('همه درست', () => {
  assert.deepEqual(evaluateGuess('پرنده', 'پرنده'), ['correct', 'correct', 'correct', 'correct', 'correct'])
})

test('درست، جای غلط و نیست با هم', () => {
  // دریچه در برابر پرنده: د جاش غلطه، ر و ه درستن، ی و چ نیستن
  assert.deepEqual(evaluateGuess('دریچه', 'پرنده'), ['present', 'correct', 'absent', 'absent', 'correct'])
})

test('حرف تکراری در حدس: فقط به تعداد توی جواب رنگ می‌گیره', () => {
  // جواب یه «ر» داره (جای دوم)؛ حدس سه تا «ر» داره -> فقط همون جای درست آبی می‌شه
  assert.deepEqual(evaluateGuess('رررست', 'پرنده'), ['absent', 'correct', 'absent', 'absent', 'absent'])
  // جواب یه «ن» داره ولی جای دیگه؛ حدس دو تا «ن» داره -> فقط اولی «جای غلط»
  assert.deepEqual(evaluateGuess('ننبتس', 'پرنده'), ['present', 'absent', 'absent', 'absent', 'absent'])
})

test('حرف تکراری در جواب', () => {
  // جواب «کشکول» دو تا «ک» داره
  assert.deepEqual(evaluateGuess('کاکاو', 'کشکول'), ['correct', 'absent', 'correct', 'absent', 'present'])
  assert.deepEqual(evaluateGuess('اکککک', 'کشکول'), ['absent', 'present', 'correct', 'absent', 'absent'])
})

test('آ و ا دو حرف جدان', () => {
  assert.deepEqual(evaluateGuess('آبادی', 'ابادی'), ['absent', 'correct', 'correct', 'correct', 'correct'])
})
