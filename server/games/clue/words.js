// لیست کلمه‌ها و رتبه‌های بازی «کلمه‌ی پنهان» (فایل‌ها توی پوشه‌ی words/ هستن و با tools/build_clue_ranks.py ساخته می‌شن)
//   valid.txt          کلمه‌هایی که می‌شه حدس زد
//   answers.txt        جواب‌های ممکن
//   ranks/<جواب>.txt   نزدیک‌ترین کلمه‌ها به اون جواب؛ خط N = رتبه‌ی N (خط ۱ خود جوابه)
import fs from 'node:fs'
import { normalizeWord } from '../word/letters.js'

const WORDS_DIR = new URL('./words/', import.meta.url)

// خوندن یه فایل متنی، هر خط یه کلمه (با \r\n ویندوز هم کار کنه)
function readLines(url) {
  return fs.readFileSync(url, 'utf8').split(/\r?\n/).map((w) => w.trim()).filter(Boolean)
}

let validMap = null
// کلمه‌ی نرمال‌شده -> شکل نمایشی (با نیم‌فاصله)
function valid() {
  if (!validMap) {
    validMap = new Map()
    for (const word of readLines(new URL('valid.txt', WORDS_DIR))) validMap.set(normalizeWord(word), word)
  }
  return validMap
}

const rankCache = new Map()
// رتبه‌های یه جواب: Map از کلمه‌ی نرمال‌شده به رتبه، به‌علاوه‌ی لیست شکل نمایشی به ترتیب رتبه
export function ranksFor(answer) {
  if (!rankCache.has(answer)) {
    const list = readLines(new URL(`ranks/${answer}.txt`, WORDS_DIR))
    const byWord = new Map()
    list.forEach((word, i) => {
      const key = normalizeWord(word)
      if (!byWord.has(key)) byWord.set(key, i + 1)
    })
    rankCache.set(answer, { byWord, list })
  }
  return rankCache.get(answer)
}

let answerList = null
// جواب‌های ممکن (نرمال‌شده)؛ فقط اون‌هایی که فایل رتبه دارن
export function answerWords() {
  if (!answerList) {
    answerList = readLines(new URL('answers.txt', WORDS_DIR))
      .map(normalizeWord)
      .filter((w) => fs.existsSync(new URL(`ranks/${w}.txt`, WORDS_DIR)))
  }
  return answerList
}

// شکل نمایشی یه کلمه‌ی نرمال‌شده (اگه توی لیست نباشه همون خودش)
export function displayWord(key) {
  return valid().get(key) ?? key
}

// این کلمه (نرمال‌شده) رو می‌شه حدس زد؟
export function isValidWord(key) {
  return valid().has(key) || answerWords().includes(key)
}
