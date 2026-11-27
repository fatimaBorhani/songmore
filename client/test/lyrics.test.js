// تست منطق بدون صفحه‌ی «جورشعر» (خط جاری، حالت خط‌ها، ساعت، متن اشتراک)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clock, currentLineIndex, lineState, shareText, songVerdict } from '../src/games/lyrics/lyrics.js'

const LINES = [{ ms: 1000 }, { ms: 4000 }, { ms: 7000 }]

test('خط جاری: آخرین خطی که زمانش رسیده', () => {
  assert.equal(currentLineIndex(LINES, 0), -1)
  assert.equal(currentLineIndex(LINES, 1000), 0)
  assert.equal(currentLineIndex(LINES, 6999), 1)
  assert.equal(currentLineIndex(LINES, 99999), 2)
})

test('حالت خط‌ها مثل اسپاتیفای', () => {
  assert.equal(lineState(0, 1, false), 'past')
  assert.equal(lineState(1, 1, false), 'cur')
  assert.equal(lineState(2, 1, false), 'next')
  assert.equal(lineState(3, -1, true), 'ans')
  assert.equal(lineState(0, -1, false), 'past')
})

test('ساعت با رقم فارسی', () => {
  assert.equal(clock(0), '۰:۰۰')
  assert.equal(clock(65400), '۱:۰۵')
})

test('جمله‌ی امتیاز آهنگ', () => {
  assert.match(songVerdict(4), /مو به مو/)
  assert.match(songVerdict(0), /فردا/)
})

test('متن اشتراک: فقط مربع‌ها و امتیاز، بدون متن ترانه', () => {
  const game = {
    dayPoints: 5,
    maxPoints: 12,
    slots: [
      { finished: true, grades: ['ok', 'close'], points: 3, lines: [{ text: 'متن مخفی' }] },
      { finished: true, grades: ['wrong', 'close'], points: 1, lines: [{ text: 'متن مخفی' }] },
      { finished: false, lines: [] },
    ],
  }
  const text = shareText(game, 'جورشعر')
  assert.equal(text, 'جورشعر\n🟩🟨 ۳\n⬛🟨 ۱\nامتیاز: ۵ از ۱۲')
  assert.ok(!text.includes('متن مخفی'))
})
