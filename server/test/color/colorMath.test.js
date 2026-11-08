// تست ریاضی رنگ، امتیازدهی و ساخت رنگ‌های روز
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { colorDistance, deltaE, hsbToRgb, rgbToLab } from '../../games/color/colorMath.js'
import { evaluateRound, hueDiff, ROUNDS, scoreFromDeltaE } from '../../games/color/scoring.js'
import { generateColors } from '../../games/color/daily.js'
import { parseColorInput } from '../../games/color/game.js'

const near = (a, b, eps = 0.1) => assert.ok(Math.abs(a - b) <= eps, `${a} باید نزدیک ${b} باشه`)

test('HSB به RGB: رنگ‌های اصلی', () => {
  assert.deepEqual(hsbToRgb(0, 100, 100), [255, 0, 0])
  assert.deepEqual(hsbToRgb(120, 100, 100), [0, 255, 0])
  assert.deepEqual(hsbToRgb(240, 100, 100), [0, 0, 255])
  assert.deepEqual(hsbToRgb(0, 0, 100), [255, 255, 255])
  assert.deepEqual(hsbToRgb(0, 0, 0), [0, 0, 0])
  assert.deepEqual(hsbToRgb(200, 0, 50), [128, 128, 128]) // اشباع صفر: خاکستری، رنگ‌مایه مهم نیست
  assert.deepEqual(hsbToRgb(30, 100, 100), [255, 128, 0])
  assert.deepEqual(hsbToRgb(360, 100, 100), hsbToRgb(0, 100, 100)) // ۳۶۰ همون ۰
})

test('RGB به Lab: مقدارهای استاندارد', () => {
  const [l, a, b] = rgbToLab([255, 0, 0])
  near(l, 53.24)
  near(a, 80.09)
  near(b, 67.2)
  const white = rgbToLab([255, 255, 255])
  near(white[0], 100)
  near(white[1], 0)
  near(white[2], 0)
  near(rgbToLab([0, 0, 0])[0], 0)
})

test('فاصله‌ی رنگ‌ها: یکی = ۰، سیاه و سفید = ۱۰۰، متقارن', () => {
  const orange = { h: 24, s: 73, b: 85 }
  const other = { h: 30, s: 65, b: 80 }
  assert.equal(colorDistance(orange, orange), 0)
  near(deltaE(rgbToLab([0, 0, 0]), rgbToLab([255, 255, 255])), 100)
  assert.equal(colorDistance(orange, other), colorDistance(other, orange))
  assert.ok(colorDistance(orange, other) < colorDistance(orange, { h: 200, s: 73, b: 85 }))
})

test('امتیاز از روی فاصله: ۰ می‌شه ۱۰ و هر چه دورتر کمتر', () => {
  assert.equal(scoreFromDeltaE(0), 10)
  assert.equal(scoreFromDeltaE(5), 8.2)
  assert.equal(scoreFromDeltaE(10), 6.7)
  assert.equal(scoreFromDeltaE(25), 3.7)
  assert.equal(scoreFromDeltaE(100), 0.2)
  let last = 10
  for (let d = 1; d <= 120; d++) {
    const s = scoreFromDeltaE(d)
    assert.ok(s <= last && s >= 0, `d=${d}`)
    last = s
  }
})

test('اختلاف رنگ‌مایه: کوتاه‌ترین مسیر روی دایره، علامت‌دار', () => {
  assert.equal(hueDiff(30, 36), 6)
  assert.equal(hueDiff(36, 30), -6)
  assert.equal(hueDiff(350, 10), 20) // از مرز ۳۶۰ رد می‌شه
  assert.equal(hueDiff(10, 350), -20)
  assert.equal(hueDiff(0, 180), 180)
  assert.equal(hueDiff(180, 0), 180)
  assert.equal(hueDiff(90, 90), 0)
})

test('نتیجه‌ی یه دور', () => {
  const target = { h: 24, s: 73, b: 85 }
  const exact = evaluateRound(target, target, 2)
  assert.deepEqual(exact.diff, { h: 0, s: 0, b: 0 })
  assert.equal(exact.score, 10)
  assert.equal(exact.deltaE, 0)
  assert.equal(exact.round, 2)

  const off = evaluateRound(target, { h: 30, s: 65, b: 80 }, 2)
  assert.deepEqual(off.diff, { h: 6, s: -8, b: -5 })
  assert.ok(off.score > 5 && off.score < 10)
  assert.deepEqual(off.target, target)
})

test('رنگ‌های روز: ۵ تا، توی بازه‌ی درست، و رنگ‌مایه‌ها از هم دورن', () => {
  for (let run = 0; run < 300; run++) {
    const colors = generateColors()
    assert.equal(colors.length, ROUNDS)
    for (const { h, s, b } of colors) {
      assert.ok(Number.isInteger(h) && h >= 0 && h < 360, `h=${h}`)
      assert.ok(s >= 35 && s <= 95, `s=${s}`)
      assert.ok(b >= 45 && b <= 95, `b=${b}`)
    }
    // هر دو رنگ حداقل ۳۶ درجه فاصله‌ی رنگ‌مایه دارن (۷۲ منهای دو بار جابه‌جایی ۱۸ درجه‌ای)
    for (let i = 0; i < ROUNDS; i++) {
      for (let j = i + 1; j < ROUNDS; j++) {
        assert.ok(Math.abs(hueDiff(colors[i].h, colors[j].h)) >= 36, `${colors[i].h} و ${colors[j].h}`)
      }
    }
  }
})

test('ساخت رنگ با عدد تصادفی ثابت، همیشه یه جواب می‌ده', () => {
  const fixed = () => 5
  assert.deepEqual(generateColors(() => 0).length, ROUNDS)
  assert.deepEqual(generateColors(fixed), generateColors(fixed))
})

test('ورودی رنگ: فقط عدد صحیح توی بازه', () => {
  assert.deepEqual(parseColorInput({ h: 30, s: 65, b: 80 }), { h: 30, s: 65, b: 80 })
  assert.deepEqual(parseColorInput({ h: 360, s: 0, b: 100 }), { h: 0, s: 0, b: 100 })
  for (const bad of [
    null,
    {},
    { h: -1, s: 50, b: 50 },
    { h: 361, s: 50, b: 50 },
    { h: 30, s: 101, b: 50 },
    { h: 30, s: 50, b: -5 },
    { h: 30.5, s: 50, b: 50 },
    { h: '30', s: 50, b: 50 },
    { h: 30, s: NaN, b: 50 },
  ]) {
    assert.equal(parseColorInput(bad), null, JSON.stringify(bad))
  }
})
