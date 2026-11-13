// ذخیره‌ی حدس‌ها و ساخت وضعیت بازی واژه‌یاب برای کلاینت.
// بازی روزانه ۳ تاست (کلمه‌ی ۳، ۴ و ۵ حرفی) که یکی‌یکی بازی می‌شن.
// هر کلمه ۶ حدس داره. بعد از ۶ حدس غلط بازیکن می‌تونه هر چقدر خواست ادامه بده (کلمه باخت حساب می‌شه) یا
// «جواب رو ببینم» رو بزنه (جدول word_gaveup).
// مهم: جواب هر کلمه فقط وقتی همون کلمه تموم شده (پیدا شده یا «جواب رو ببینم» زده شده) توی وضعیت میاد.
import { db } from '../../core/db.js'
import { evaluateGuess } from './evaluate.js'
import { MAX_GUESSES } from './wordLists.js'

export function getWordGuesses(playerKey, date, length) {
  return db
    .prepare('SELECT word FROM word_guesses WHERE player_key = ? AND date = ? AND length = ? ORDER BY guess_number')
    .all(playerKey, date, length)
    .map((row) => row.word)
}

export function addWordGuess(playerKey, date, length, word) {
  const count = getWordGuesses(playerKey, date, length).length
  db.prepare(
    'INSERT INTO word_guesses (player_key, date, length, guess_number, word, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(playerKey, date, length, count + 1, word, Date.now())
}

function hasGivenUp(playerKey, date, length) {
  return !!db.prepare('SELECT 1 FROM word_gaveup WHERE player_key = ? AND date = ? AND length = ?').get(playerKey, date, length)
}

// «جواب رو ببینم» برای یه کلمه (دوباره زدنش اثری نداره)
export function addWordGaveUp(playerKey, date, length) {
  db.prepare('INSERT OR IGNORE INTO word_gaveup (player_key, date, length, created_at) VALUES (?, ?, ?, ?)').run(
    playerKey,
    date,
    length,
    Date.now()
  )
}

// پاک کردن بازی امروزِ همه (فقط حالت تست)
export function clearWordGames(date) {
  db.prepare('DELETE FROM word_guesses WHERE date = ?').run(date)
  db.prepare('DELETE FROM word_gaveup WHERE date = ?').run(date)
}

// وضعیت یه کلمه (یه بازی از ۳ تا). answer فقط وقتی finished.
//   solved: کلمه پیدا شده (هر موقع)   won: توی ۶ حدس پیدا شده (برد حساب می‌شه)
//   exhausted: ۶ حدس تموم شده و بازیکن هنوز نه پیداش کرده نه «جواب رو ببینم» زده
function slotState(playerKey, date, { length, word: answer }) {
  const words = getWordGuesses(playerKey, date, length)
  const guesses = words.map((word) => {
    const results = evaluateGuess(word, answer)
    return {
      word,
      letters: Array.from(word).map((letter, i) => ({ letter, result: results[i] })),
    }
  })
  const maxGuesses = MAX_GUESSES[length]
  const solved = words.includes(answer)
  const finished = solved || hasGivenUp(playerKey, date, length)
  const won = solved && words.length <= maxGuesses
  const exhausted = !finished && words.length >= maxGuesses
  const state = { wordLength: length, maxGuesses, guesses, finished, solved, won, exhausted }
  if (finished) state.answer = answer
  return state
}

// کلمه‌ی جاری: اولین بازی‌ای که هنوز تموم نشده (اگه همه تموم شده، آخری)
export function currentIndex(playerKey, date, daily) {
  const i = daily.findIndex((d) => !slotState(playerKey, date, d).finished)
  return i === -1 ? daily.length - 1 : i
}

// وضعیت بازی امروز: کلمه‌ی جاری مثل قبل + پیشرفت روز (slots) و dayFinished.
// برای بازی‌های تموم‌شده جواب و رنگ ردیف‌ها (برای خلاصه و اشتراک) هست، برای بقیه نه.
export function getWordGameState(playerKey, date, daily, index = null) {
  const slots = daily.map((d) => slotState(playerKey, date, d))
  const i = index ?? currentIndex(playerKey, date, daily)
  const current = slots[i]
  return {
    date,
    slot: i + 1,
    slotCount: daily.length,
    ...current,
    slots: slots.map((s, k) => ({
      slot: k + 1,
      length: s.wordLength,
      maxGuesses: s.maxGuesses,
      finished: s.finished,
      ...(s.finished
        ? {
            won: s.won,
            solved: s.solved,
            answer: s.answer,
            guessCount: s.guesses.length,
            rows: s.guesses.map((g) => g.letters.map((l) => l.result)),
          }
        : {}),
    })),
    dayFinished: slots.every((s) => s.finished),
  }
}
