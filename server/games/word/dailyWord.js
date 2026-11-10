// کلمه‌های روزانه: هر روز ۳ کلمه (۳، ۴ و ۵ حرفی) که برای همه‌ی بازیکن‌ها یکیه.
// هر تاریخ یه بار انتخاب و توی جدول word_daily ذخیره می‌شه (پس بعداً عوض نمی‌شه).
import { randomInt } from 'node:crypto'
import { db } from '../../core/db.js'
import { answerWords, LENGTHS } from './wordLists.js'

const pick = (list) => list[randomInt(list.length)]

// کلمه‌ی جدید برای این طول: از جواب‌هایی که تا حالا نیومدن؛ وقتی همه اومدن دوباره از اول (به جز آخری)
function pickAnswer(length) {
  const answers = answerWords(length)
  const rows = db.prepare('SELECT word FROM word_daily WHERE length = ? ORDER BY date DESC').all(length)
  const used = new Set(rows.map((r) => r.word))
  let pool = answers.filter((w) => !used.has(w))
  if (pool.length === 0) pool = answers.filter((w) => w !== rows[0]?.word)
  return pick(pool.length ? pool : answers)
}

// کلمه‌های این تاریخ به ترتیب: [{ length: 3, word }, { length: 4, word }, { length: 5, word }]
export function getDailyWords(date) {
  const saved = new Map(
    db.prepare('SELECT length, word FROM word_daily WHERE date = ?').all(date).map((r) => [r.length, r.word])
  )
  const insert = db.prepare('INSERT INTO word_daily (date, length, word) VALUES (?, ?, ?)')
  return LENGTHS.map((length) => {
    if (!saved.has(length)) {
      const word = pickAnswer(length)
      insert.run(date, length, word)
      saved.set(length, word)
    }
    return { length, word: saved.get(length) }
  })
}

// فقط برای تست (حالت --random-song): کلمه‌های امروز رو با کلمه‌های تصادفی جدید عوض می‌کنه
export function pickNewRandomWords(date) {
  db.prepare('DELETE FROM word_daily WHERE date = ?').run(date)
  const insert = db.prepare('INSERT INTO word_daily (date, length, word) VALUES (?, ?, ?)')
  for (const length of LENGTHS) insert.run(date, length, pick(answerWords(length)))
  return getDailyWords(date)
}
