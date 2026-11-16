// تست کمک‌های حافظه‌ی رنگ: تبدیل HSB، رنگ متن خوانا، امتیاز و متن اشتراک
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { INITIAL_HSB, faScore, hsbToCss, hsbToRgb, readableOn, shareText, sliderTracks } from '../src/games/color/color.js'
import { hsbToRgb as serverHsbToRgb } from '../../server/games/color/colorMath.js'

test('hsbToRgb رنگ‌های اصلی رو درست می‌سازه', () => {
  assert.deepEqual(hsbToRgb({ h: 0, s: 100, b: 100 }), [255, 0, 0])
  assert.deepEqual(hsbToRgb({ h: 60, s: 100, b: 100 }), [255, 255, 0])
  assert.deepEqual(hsbToRgb({ h: 120, s: 100, b: 100 }), [0, 255, 0])
  assert.deepEqual(hsbToRgb({ h: 180, s: 100, b: 100 }), [0, 255, 255])
  assert.deepEqual(hsbToRgb({ h: 240, s: 100, b: 100 }), [0, 0, 255])
  assert.deepEqual(hsbToRgb({ h: 300, s: 100, b: 100 }), [255, 0, 255])
})

test('hsbToRgb سیاه، سفید و طوسی رو درست می‌سازه و ۳۶۰ همون ۰ هست', () => {
  assert.deepEqual(hsbToRgb({ h: 200, s: 50, b: 0 }), [0, 0, 0])
  assert.deepEqual(hsbToRgb({ h: 200, s: 0, b: 100 }), [255, 255, 255])
  assert.deepEqual(hsbToRgb({ h: 77, s: 0, b: 50 }), [128, 128, 128])
  assert.deepEqual(hsbToRgb({ h: 360, s: 100, b: 100 }), hsbToRgb({ h: 0, s: 100, b: 100 }))
})

test('رنگ توی مرورگر همونیه که سرور باهاش امتیاز می‌ده', () => {
  for (let h = 0; h <= 360; h += 17) {
    for (const s of [0, 35, 62, 95, 100]) {
      for (const b of [0, 45, 71, 95, 100]) {
        assert.deepEqual(hsbToRgb({ h, s, b }), serverHsbToRgb(h, s, b), `h=${h} s=${s} b=${b}`)
      }
    }
  }
})

test('hsbToCss متن rgb می‌ده', () => {
  assert.equal(hsbToCss(INITIAL_HSB), 'rgb(64, 128, 128)')
})

test('readableOn روی رنگ روشن مشکی و روی رنگ تیره سفید می‌ده', () => {
  assert.equal(readableOn({ h: 60, s: 100, b: 100 }), '#09090B') // زرد
  assert.equal(readableOn({ h: 0, s: 0, b: 100 }), '#09090B') // سفید
  assert.equal(readableOn({ h: 240, s: 100, b: 60 }), '#FFFFFF') // آبی تیره
  assert.equal(readableOn({ h: 0, s: 0, b: 0 }), '#FFFFFF') // سیاه
})

test('زمینه‌ی اسلایدرها: رنگ‌مایه رنگین‌کمان ثابته، اشباع و روشنی با رنگ فعلی عوض می‌شن', () => {
  const a = sliderTracks({ h: 10, s: 50, b: 50 })
  const b = sliderTracks({ h: 200, s: 50, b: 50 })
  assert.equal(a.h, b.h)
  assert.notEqual(a.s, b.s)
  assert.notEqual(a.b, b.b)
  assert.ok(a.b.includes('rgb(0, 0, 0)')) // روشنی از سیاه شروع می‌شه
})

test('faScore عدد صحیح رو بدون اعشار و بقیه رو با دو رقم اعشار می‌نویسه', () => {
  assert.equal(faScore(10), '۱۰')
  assert.equal(faScore(0), '۰')
  assert.equal(faScore(9.82), '۹٫۸۲')
  assert.equal(faScore(8.4), '۸٫۴۰')
})

test('متن اشتراک جمع و امتیاز هر دور رو داره و هیچ رنگی رو لو نمی‌ده', () => {
  const game = { total: 41.37, maxTotal: 50, rounds: [{ score: 9.82 }, { score: 10 }, { score: 7.5 }, { score: 8 }, { score: 6.05 }] }
  const text = shareText(game, 'حافظه‌ی رنگ')
  assert.equal(text, 'حافظه‌ی رنگ ۴۱٫۳۷/۵۰\n۹٫۸۲ · ۱۰ · ۷٫۵۰ · ۸ · ۶٫۰۵')
  assert.equal(/rgb|#[0-9a-f]{3}/i.test(text), false)
})
