// ذخیره‌ی حدس‌ها و ساخت وضعیت بازی واژه‌یاب برای کلاینت.
// مهم: جواب فقط وقتی بازی تموم شده (برد یا حدس ششم) توی وضعیت میاد.
import { db } from '../../core/db.js'
import { evaluateGuess } from './evaluate.js'
import { MAX_GUESSES, WORD_LENGTH } from './letters.js'

export function getWordGuesses(playerKey, date) {
  return db
    .prepare('SELECT word FROM word_guesses WHERE player_key = ? AND date = ? ORDER BY guess_number')
    .all(playerKey, date)
    .map((row) => row.word)
}

export function addWordGuess(playerKey, date, word) {
  const count = getWordGuesses(playerKey, date).length
  db.prepare(
    'INSERT INTO word_guesses (player_key, date, guess_number, word, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(playerKey, date, count + 1, word, Date.now())
}

// پاک کردن بازی امروز یه بازیکن (فقط حالت تست)
export function clearWordGame(playerKey, date) {
  db.prepare('DELETE FROM word_guesses WHERE player_key = ? AND date = ?').run(playerKey, date)
}

export function getWordGameState(playerKey, date, answer) {
  const words = getWordGuesses(playerKey, date)
  const guesses = words.map((word) => {
    const results = evaluateGuess(word, answer)
    return {
      word,
      letters: Array.from(word).map((letter, i) => ({ letter, result: results[i] })),
    }
  })
  const won = words.includes(answer)
  const finished = won || words.length >= MAX_GUESSES

  const state = { date, wordLength: WORD_LENGTH, maxGuesses: MAX_GUESSES, guesses, finished, won }
  if (finished) state.answer = answer
  return state
}
