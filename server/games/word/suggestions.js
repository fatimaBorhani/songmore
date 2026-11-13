// «فکر می‌کنم درسته»: کلمه‌ای که بازیکن می‌گه معنی داره ولی توی لیست نبود. فقط ذخیره می‌شه تا خودمون بررسی کنیم.
// هر کلمه‌ی معنی‌داری قبوله (صرف فعل و جمع هم)؛ فقط کلمه‌های بی‌معنیِ واضح (یه حرف سه بار پشت هم) و کلمه‌های موجود رد می‌شن.
// حداقل رأی برای بررسی ۱ تاست (بازیکن کمه و بررسی سبکه)
import { db } from '../../core/db.js'
import { LENGTHS } from './wordLists.js'
import { normalizeWord, validateWord } from './letters.js'

export const MAX_SUGGESTIONS_PER_DAY = 10

// کد خطا یا null (یعنی ثبت شد). دوباره پیشنهاد دادنِ همون کلمه خطا نیست ولی دوباره شمرده نمی‌شه
export function suggestWord(playerKey, date, rawWord) {
  const word = normalizeWord(rawWord)
  const length = Array.from(word).length
  if (!LENGTHS.includes(length)) return 'WORD_LENGTH' // اول طول؛ برای طول‌های دیگه لیستی نداریم
  const error = validateWord(word, length)
  if (error === 'INVALID_LETTERS') return 'INVALID_LETTERS'
  if (error === null) return 'ALREADY_IN_LIST'
  if (/(.)\1\1/u.test(word)) return 'NOT_A_WORD' // مثل «ااا» یا «ببببب»

  const exists = db.prepare('SELECT 1 FROM word_suggestions WHERE player_key = ? AND word = ?').get(playerKey, word)
  if (exists) return null
  const today = db.prepare('SELECT COUNT(*) AS n FROM word_suggestions WHERE player_key = ? AND date = ?').get(playerKey, date).n
  if (today >= MAX_SUGGESTIONS_PER_DAY) return 'TOO_MANY_SUGGESTIONS'
  db.prepare('INSERT INTO word_suggestions (player_key, word, length, date, created_at) VALUES (?, ?, ?, ?, ?)').run(playerKey, word, length, date, Date.now())
  return null
}
