// تست فرمول امتیاز
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stageValue, computeScore, getWorth, STAGES } from '../scoring.js'

// حدس‌ها از روی یه رشته: s = رد کردن، x = غلط، p = خواننده درسته، c = درست
function g(pattern) {
  const map = { s: 'skipped', x: 'incorrect', p: 'present', c: 'correct' }
  return [...pattern].map((ch, i) => ({ guess_number: i + 1, result: map[ch] }))
}

test('ارزش هر مرحله همون جدول پلنه', () => {
  assert.deepEqual(STAGES.map(stageValue), [10000, 7564, 5305, 3797, 3500])
})

test('نمونه‌های جدول پلن', () => {
  assert.equal(computeScore(g('c')), 10000) // حدس اول
  assert.equal(computeScore(g('xc')), 9000) // یه غلط، بعد درست
  assert.equal(computeScore(g('sc')), 7564) // یه رد کردن، بعد درست
  assert.equal(computeScore(g('pssc')), 4805) // خواننده درسته + دو رد کردن، بعد درست
  assert.equal(computeScore(g('ssssc')), 3500) // چهار رد کردن، بعد درست
  assert.equal(computeScore(g('xxxxx')), 0) // باخت
  assert.equal(computeScore(g('sssss')), 0) // باخت با رد کردن
})

test('بازی نیمه‌کاره امتیاز نداره', () => {
  assert.equal(computeScore([]), null)
  assert.equal(computeScore(g('xs')), null)
})

test('بدترین برد ممکن هنوز امتیاز خوبی داره (کف ۱۰۰۰ فقط برای احتیاطه)', () => {
  // سه رد کردن + یه غلط: ۳۷۹۷ − ۱۰۰۰
  assert.equal(computeScore(g('sssxc')), 2797)
  // همه‌ی ترکیب‌های ممکن ۴ حدس قبل از درست: هیچ‌وقت زیر ۱۰۰۰ نمی‌ره
  for (const a of 'sxp') for (const b of 'sxp') for (const c of 'sxp') for (const d of 'sxp') {
    assert.ok(computeScore(g(a + b + c + d + 'c')) >= 1000)
  }
})

test('ارزش الان و ارزش بعد از رد کردن', () => {
  assert.deepEqual(getWorth([]), { worthNow: 10000, worthAfterSkip: 7564 })
  assert.deepEqual(getWorth(g('x')), { worthNow: 9000, worthAfterSkip: 6564 })
  assert.deepEqual(getWorth(g('ps')), { worthNow: 7064, worthAfterSkip: 4805 })
  // توی مرحله‌ی آخر، رد کردن دیگه ارزش رو کم نمی‌کنه
  assert.deepEqual(getWorth(g('ssss')), { worthNow: 3500, worthAfterSkip: 3500 })
})

test('ارزش الان همیشه با امتیاز واقعی بعد از حدس درست یکیه', () => {
  for (const pattern of ['', 'x', 's', 'ps', 'xsx', 'ssss', 'pxsp']) {
    assert.equal(getWorth(g(pattern)).worthNow, computeScore(g(pattern + 'c')), pattern)
  }
})
