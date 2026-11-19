// وضعیت بازی «کلمه‌ی پنهان» برای یه بازیکن و یه تاریخ، و ثبت حدس و راهنما و تسلیم.
// جواب و کلمه‌های نزدیک فقط وقتی بازی تموم شده (پیدا کرده یا تسلیم شده) به کلاینت می‌رسن.
import { db } from '../../core/db.js'
import { normalizeWord } from '../word/letters.js'
import { displayWord, isValidWord, ranksFor } from './words.js'

export const MAX_WORD_LENGTH = 30
export const NEAR_COUNT = 10 // آخر بازی چندتا کلمه‌ی نزدیک به جواب نشون داده بشه
const FIRST_HINT_RANK = 300 // راهنمای اول (وقتی هنوز هیچ کلمه‌ای رتبه نگرفته) از این رتبه شروع می‌شه

function guessRows(playerKey, date) {
  return db
    .prepare('SELECT guess_number, word, hint FROM clue_guesses WHERE player_key = ? AND date = ? ORDER BY guess_number')
    .all(playerKey, date)
}

function hasGivenUp(playerKey, date) {
  return !!db.prepare('SELECT 1 FROM clue_gaveup WHERE player_key = ? AND date = ?').get(playerKey, date)
}

// وضعیت بازی برای کلاینت
// guesses: به ترتیب زده شدن؛ rank = رتبه (۱ = جواب) یا null یعنی «دور» (بیرون از کلمه‌های نزدیک)
export function getClueState(playerKey, date, answer) {
  const ranks = ranksFor(answer)
  const guesses = guessRows(playerKey, date).map((r) => ({
    number: r.guess_number,
    word: displayWord(r.word),
    rank: ranks.byWord.get(r.word) ?? null,
    hint: !!r.hint,
  }))
  const found = guesses.some((g) => g.rank === 1)
  const gaveUp = hasGivenUp(playerKey, date)
  const finished = found || gaveUp
  const ranked = guesses.filter((g) => g.rank !== null).map((g) => g.rank)
  return {
    date,
    guesses,
    guessCount: guesses.filter((g) => !g.hint).length,
    hintCount: guesses.filter((g) => g.hint).length,
    bestRank: ranked.length ? Math.min(...ranked) : null,
    maxRank: ranks.list.length, // بیشتر از این «دور» حساب می‌شه
    found,
    gaveUp,
    finished,
    // فقط آخر بازی
    answer: finished ? ranks.list[0] : null,
    near: finished ? ranks.list.slice(1, NEAR_COUNT + 1).map((word, i) => ({ word, rank: i + 2 })) : [],
  }
}

// رتبه‌ی کلمه‌ای که راهنما نشون می‌ده، یا null اگه دیگه راهنمایی نمونده.
// همیشه از بهترین رتبه‌ی بازیکن نزدیک‌تره ولی هیچ‌وقت خود جواب (رتبه‌ی ۱) نیست:
// زیر ۲۰ یه پله جلوتر، بالاتر حدود ۸۰٪ بهترین رتبه (مثلاً ۱۰۰ -> ۸۰)
export function nextHintRank(guessedRanks, maxRank) {
  const taken = new Set(guessedRanks.filter((r) => r !== null))
  const best = taken.size ? Math.min(...taken) : null
  if (best !== null && best <= 2) return null
  const limit = best ?? maxRank + 1 // رتبه‌ی راهنما باید کمتر از این باشه
  let target
  if (best === null) target = Math.min(FIRST_HINT_RANK, maxRank)
  else if (best <= 20) target = best - 1
  else target = Math.max(2, Math.ceil(best * 0.8))
  // اول به سمت جواب دنبال رتبه‌ای می‌گردیم که هنوز حدس زده نشده، بعد به سمت بهترین رتبه
  for (let r = target; r >= 2; r--) if (!taken.has(r)) return r
  for (let r = target + 1; r < limit; r++) if (!taken.has(r)) return r
  return null
}

function addRow(playerKey, date, word, hint) {
  const row = db
    .prepare('SELECT MAX(guess_number) AS n FROM clue_guesses WHERE player_key = ? AND date = ?')
    .get(playerKey, date)
  db.prepare(
    'INSERT INTO clue_guesses (player_key, date, guess_number, word, hint, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(playerKey, date, (row.n ?? 0) + 1, word, hint ? 1 : 0, Date.now())
}

// ثبت یه حدس؛ اگه قبول نشد کد خطا برمی‌گردونه، وگرنه null
export function addClueGuess(playerKey, date, answer, text) {
  if (getClueState(playerKey, date, answer).finished) return 'GAME_OVER'
  const word = normalizeWord(typeof text === 'string' ? text : '')
  if (!word || Array.from(word).length > MAX_WORD_LENGTH) return 'INVALID_WORD'
  if (!isValidWord(word)) return 'NOT_IN_LIST'
  if (guessRows(playerKey, date).some((r) => r.word === word)) return 'ALREADY_GUESSED'
  addRow(playerKey, date, word, false)
  return null
}

// راهنما: یه کلمه‌ی نزدیک‌تر به لیست حدس‌ها اضافه می‌کنه
export function addClueHint(playerKey, date, answer) {
  const state = getClueState(playerKey, date, answer)
  if (state.finished) return 'GAME_OVER'
  const rank = nextHintRank(state.guesses.map((g) => g.rank), state.maxRank)
  if (rank === null) return 'NO_HINTS'
  addRow(playerKey, date, normalizeWord(ranksFor(answer).list[rank - 1]), true)
  return null
}

// تسلیم: بازی تموم می‌شه و جواب نشون داده می‌شه
export function giveUpClue(playerKey, date, answer) {
  if (getClueState(playerKey, date, answer).finished) return 'GAME_OVER'
  db.prepare('INSERT INTO clue_gaveup (player_key, date, created_at) VALUES (?, ?, ?)').run(playerKey, date, Date.now())
  return null
}

// فقط حالت تست: بازی‌های امروزِ همه پاک می‌شه
export function clearClueGames(date) {
  db.prepare('DELETE FROM clue_guesses WHERE date = ?').run(date)
  db.prepare('DELETE FROM clue_gaveup WHERE date = ?').run(date)
}
