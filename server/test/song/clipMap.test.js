// تست چک شکل clip_map.json: شکل درست «مرحله ← اسم فایل»؛ هر چیز دیگه (مثلاً یه متن) رد می‌شه
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertClipMapOk, badClipEntries, isValidClipEntry } from '../../games/song/clipMap.js'

const good = { '0.15': 'a.mp3', '0.5': 'b.mp3', 2: 'c.mp3', 8: 'd.mp3', 15: 'e.mp3' }

test('ورودی درست: دیکشنری مرحله ← اسم فایل', () => {
  assert.equal(isValidClipEntry(good), true)
  assert.equal(isValidClipEntry({ '0.15': 'a.mp3' }), true)
})

test('ورودی نادرست: متن، آرایه، خالی، مقدار غیرمتن، null', () => {
  for (const bad of ['8f0601302aa3', ['a.mp3'], {}, { '0.15': 5 }, { '0.15': '' }, { '0.15': null }, null, undefined, 7]) {
    assert.equal(isValidClipEntry(bad), false, JSON.stringify(bad))
  }
})

test('badClipEntries شناسه‌ی ورودی‌های خراب رو می‌ده', () => {
  assert.deepEqual(badClipEntries({ a: good, b: 'x', c: good, d: {} }), ['b', 'd'])
  assert.deepEqual(badClipEntries({}), [])
})

test('assertClipMapOk: سالم بی‌صدا رد می‌شه، خراب خطا با پیام فارسی و راه حل می‌ده', () => {
  assert.doesNotThrow(() => assertClipMapOk({ a: good, b: good }))
  assert.doesNotThrow(() => assertClipMapOk({}))
  assert.throws(() => assertClipMapOk({ b56bcaee: '8f0601302aa3', ok: good }), (e) => {
    assert.match(e.message, /1 ورودی از 2/)
    assert.match(e.message, /b56bcaee/)
    assert.match(e.message, /git restore data\/clip_map\.json/)
    return true
  })
})
