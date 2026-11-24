// کلمه‌ها و رتبه‌های بازی «جوربندی» (فایل‌ها توی پوشه‌ی words/ هستن و با tools/build_clue_ranks.py ساخته می‌شن)
//   valid.txt     کلمه‌هایی که می‌شه حدس زد (هر خط یه کلمه)
//   answers.txt   جواب‌های ممکن
//   vectors.bin   «معنی» هر کلمه (بردار) به همون ترتیب valid.txt:
//                 count و dim (uint32)، بعد count تا ضریب float32، بعد count×dim تا int8
// رتبه‌ی همه‌ی کلمه‌ها تا جواب، هر بار که لازم بشه یه بار حساب و نگه داشته می‌شه.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeWord } from '../word/letters.js'

// برای تست‌ها می‌شه پوشه‌ی دیگه‌ای داد
const WORDS_DIR = process.env.CLUE_WORDS_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'words')

// خوندن یه فایل متنی، هر خط یه کلمه (با \r\n ویندوز هم کار کنه)
function readLines(file) {
  return fs.readFileSync(path.join(WORDS_DIR, file), 'utf8').split(/\r?\n/).map((w) => w.trim()).filter(Boolean)
}

let data = null
// همه‌ی داده‌ها یه بار خونده می‌شن: کلمه‌ها، جای هر کلمه، بردارها و جواب‌ها
function load() {
  if (data) return data
  const words = readLines('valid.txt') // شکل نمایشی، به ترتیب بردارها
  const keys = words.map(normalizeWord)
  const index = new Map(keys.map((k, i) => [k, i]))

  const buf = fs.readFileSync(path.join(WORDS_DIR, 'vectors.bin'))
  const count = buf.readUInt32LE(0)
  const dim = buf.readUInt32LE(4)
  if (count !== words.length) {
    throw new Error(`vectors.bin با valid.txt جور نیست (${count} بردار، ${words.length} کلمه). اسکریپت build_clue_ranks.py رو دوباره اجرا کن.`)
  }
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) scales[i] = buf.readFloatLE(8 + i * 4)
  const vectors = new Int8Array(buf.buffer, buf.byteOffset + 8 + count * 4, count * dim)

  const answers = readLines('answers.txt').map(normalizeWord).filter((k) => index.has(k))
  data = { words, keys, index, count, dim, scales, vectors, answers }
  return data
}

// داده‌ها هست؟ (اگه vectors.bin ساخته نشده باشه بازی کار نمی‌کنه)
export function hasClueData() {
  try {
    load()
    return true
  } catch {
    return false
  }
}

const rankCache = new Map()
const CACHE_SIZE = 4 // رتبه‌های چند جواب آخر توی حافظه می‌مونه

// رتبه‌ی همه‌ی کلمه‌ها تا یه جواب (نرمال‌شده):
//   byWord: کلمه‌ی نرمال‌شده -> رتبه (۱ = خود جواب)
//   list:   شکل نمایشی کلمه‌ها به ترتیب رتبه
export function ranksFor(answer) {
  if (rankCache.has(answer)) return rankCache.get(answer)
  const { words, keys, index, count, dim, scales, vectors } = load()
  const a = index.get(answer)
  if (a === undefined) throw new Error(`جواب «${answer}» توی valid.txt نیست`)

  // شباهت هر کلمه با جواب = ضرب داخلی بردارها (ضریب خود جواب برای همه یکیه، پس لازم نیست)
  const sims = new Float64Array(count)
  const base = a * dim
  for (let i = 0; i < count; i++) {
    let dot = 0
    const off = i * dim
    for (let d = 0; d < dim; d++) dot += vectors[off + d] * vectors[base + d]
    sims[i] = dot * scales[i]
  }
  sims[a] = Infinity // خود جواب همیشه رتبه‌ی ۱

  const order = Array.from({ length: count }, (_, i) => i).sort((x, y) => sims[y] - sims[x] || x - y)
  const byWord = new Map()
  order.forEach((i, r) => byWord.set(keys[i], r + 1))
  const result = { byWord, list: order.map((i) => words[i]) }

  rankCache.set(answer, result)
  if (rankCache.size > CACHE_SIZE) rankCache.delete(rankCache.keys().next().value)
  return result
}

// جواب‌های ممکن (نرمال‌شده)
export function answerWords() {
  return load().answers
}

// شکل نمایشی یه کلمه‌ی نرمال‌شده
export function displayWord(key) {
  const { index, words } = load()
  return index.has(key) ? words[index.get(key)] : key
}

// این کلمه (نرمال‌شده) رو می‌شه حدس زد؟
export function isValidWord(key) {
  return load().index.has(key)
}
