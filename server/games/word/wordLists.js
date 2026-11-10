// لیست کلمه‌های واژه‌یاب (فایل‌ها توی پوشه‌ی words/ هستن و با tools/build_word_lists.py ساخته می‌شن).
// هر روز سه بازی داریم: کلمه‌ی ۳، ۴ و ۵ حرفی، به ترتیب.
import fs from 'node:fs'

export const LENGTHS = [3, 4, 5]
// تعداد حدس هر بازی: هر چه کلمه کوتاه‌تر، حدس کمتر
export const MAX_GUESSES = { 3: 4, 4: 5, 5: 6 }

const cache = new Map()

function load(kind, length) {
  const key = `${kind}_${length}`
  if (!cache.has(key)) {
    const text = fs.readFileSync(new URL(`./words/${key}.txt`, import.meta.url), 'utf8')
    // با \r\n هم کار کنه (توی ویندوز git ممکنه آخر هر خط \r بذاره)
    cache.set(key, text.split(/\r?\n/).map((w) => w.trim()).filter(Boolean))
  }
  return cache.get(key)
}

// جواب‌های ممکن (آرایه)
export function answerWords(length) {
  return load('answers', length)
}

// حدس‌های مجاز (Set؛ شامل همه‌ی جواب‌ها)
export function validWords(length) {
  const key = `valid_set_${length}`
  if (!cache.has(key)) cache.set(key, new Set([...load('valid', length), ...load('answers', length)]))
  return cache.get(key)
}
