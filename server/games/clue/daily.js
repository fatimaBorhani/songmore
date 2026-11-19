// کلمه‌ی روزانه‌ی «کلمه‌ی پنهان»: هر روز یه کلمه که برای همه یکیه.
// هر تاریخ یه بار انتخاب و توی جدول clue_daily ذخیره می‌شه (پس بعداً عوض نمی‌شه).
import { randomInt } from 'node:crypto'
import { db } from '../../core/db.js'
import { answerWords } from './words.js'

const pick = (list) => list[randomInt(list.length)]

// جواب جدید: از جواب‌هایی که تا حالا نیومدن؛ وقتی همه اومدن دوباره از اول (به جز آخری)
function pickAnswer() {
  const answers = answerWords()
  const rows = db.prepare('SELECT word FROM clue_daily ORDER BY date DESC').all()
  const used = new Set(rows.map((r) => r.word))
  let pool = answers.filter((w) => !used.has(w))
  if (pool.length === 0) pool = answers.filter((w) => w !== rows[0]?.word)
  return pick(pool.length ? pool : answers)
}

// کلمه‌ی این تاریخ (نرمال‌شده)
export function getDailyClue(date) {
  const saved = db.prepare('SELECT word FROM clue_daily WHERE date = ?').get(date)
  if (saved) return saved.word
  const word = pickAnswer()
  db.prepare('INSERT INTO clue_daily (date, word) VALUES (?, ?)').run(date, word)
  return word
}

// فقط برای تست (حالت --random-song): کلمه‌ی امروز رو با یه کلمه‌ی تصادفی جدید عوض می‌کنه
export function pickNewRandomClue(date) {
  db.prepare('DELETE FROM clue_daily WHERE date = ?').run(date)
  const word = pick(answerWords())
  db.prepare('INSERT INTO clue_daily (date, word) VALUES (?, ?)').run(date, word)
  return word
}
