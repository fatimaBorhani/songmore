// بازی تمرینی حدس آهنگ: نامحدود، آهنگ تصادفی بدون تکرار، بدون امتیاز و لیگ.
// فقط تعداد بازی‌های تموم‌شده توی «فعالیت» پروفایل می‌شمرن.
import { db } from '../../core/db.js'
import { MAX_GUESSES } from './scoring.js'
import { buildGameState } from './guesses.js'
import { pickDailySong } from './dailySong.js'

function latestGame(playerKey) {
  return db
    .prepare('SELECT * FROM practice_games WHERE player_key = ? ORDER BY id DESC LIMIT 1')
    .get(playerKey)
}

function gameGuesses(gameId) {
  return db
    .prepare('SELECT guess_number, guess_text, result FROM practice_guesses WHERE game_id = ? ORDER BY guess_number')
    .all(gameId)
}

export function isFinished(guesses) {
  return guesses.length >= MAX_GUESSES || guesses.some((g) => g.result === 'correct')
}

// آهنگ بعدی: از آهنگ‌هایی که توی این دور نیومدن، به جز آهنگ امروزِ مسابقه‌ای (که جوابش لو نره).
// وقتی همه اومدن دور بعد شروع می‌شه (و آهنگ قبلی پشت‌سرهم تکرار نمی‌شه).
function pickSong(playerKey, date, last) {
  const daily = pickDailySong(date)
  const fresh = (cycle) =>
    db
      .prepare(
        `SELECT id FROM songs WHERE id != ?
           AND id NOT IN (SELECT song_id FROM practice_games WHERE player_key = ? AND cycle = ?)
         ORDER BY RANDOM() LIMIT 1`
      )
      .get(daily, playerKey, cycle)

  let cycle = last?.cycle ?? 1
  let row = fresh(cycle)
  if (!row) {
    cycle += 1
    row = db
      .prepare('SELECT id FROM songs WHERE id != ? AND id != ? ORDER BY RANDOM() LIMIT 1')
      .get(daily, last?.song_id ?? '')
  }
  // آهنگ‌ها خیلی کم‌ان (مثلاً فقط یکی): مجبوریم تکراری یا حتی آهنگ امروز رو بدیم
  if (!row) row = db.prepare('SELECT id FROM songs ORDER BY RANDOM() LIMIT 1').get()
  if (!row) return null
  return { songId: row.id, cycle }
}

function createGame(playerKey, date, last) {
  const pick = pickSong(playerKey, date, last)
  if (!pick) throw new Error('NO_SONGS')
  const info = db
    .prepare('INSERT INTO practice_games (player_key, song_id, cycle, date, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(playerKey, pick.songId, pick.cycle, date, Date.now())
  return db.prepare('SELECT * FROM practice_games WHERE id = ?').get(info.lastInsertRowid)
}

// بازی فعلی بازیکن (اگه هنوز هیچ بازی تمرینی نداشته، یکی ساخته می‌شه).
// بازی تموم‌شده می‌مونه تا نتیجه‌ش دیده بشه؛ بازی بعدی فقط با startNext میاد.
export function getCurrentGame(playerKey, date) {
  return latestGame(playerKey) ?? createGame(playerKey, date, null)
}

// اگه بازی فعلی تموم شده بازی جدید می‌سازه، وگرنه همون بازی نیمه‌تموم رو برمی‌گردونه
export function startNext(playerKey, date) {
  const last = latestGame(playerKey)
  if (last && !isFinished(gameGuesses(last.id))) return last
  return createGame(playerKey, date, last)
}

export function addPracticeGuess(game, guessText, result) {
  const count = gameGuesses(game.id).length
  if (count >= MAX_GUESSES) throw new Error('GAME_OVER')
  db.prepare(
    'INSERT INTO practice_guesses (game_id, guess_number, guess_text, result, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(game.id, count + 1, guessText, result, Date.now())
}

// وضعیت بازی برای کلاینت: مثل بازی مسابقه‌ای ولی بدون امتیاز؛ جواب فقط آخر بازی
export function getPracticeState(game) {
  return buildGameState(gameGuesses(game.id), game.song_id, { date: game.date, withScore: false })
}

// تعداد بازی‌های تموم‌شده‌ی هر روز: { '2026-11-08': 3, ... } (فقط از تاریخ from به بعد)
export function practiceGamesByDay(playerKey, from, to) {
  const rows = db
    .prepare(
      `SELECT g.id, g.date, p.result FROM practice_games g
       JOIN practice_guesses p ON p.game_id = g.id
       WHERE g.player_key = ? AND g.date >= ? AND g.date <= ?
       ORDER BY g.id, p.guess_number`
    )
    .all(playerKey, from, to)
  const games = new Map()
  for (const row of rows) {
    if (!games.has(row.id)) games.set(row.id, { date: row.date, guesses: [] })
    games.get(row.id).guesses.push(row)
  }
  const perDay = new Map()
  for (const game of games.values()) {
    if (isFinished(game.guesses)) perDay.set(game.date, (perDay.get(game.date) ?? 0) + 1)
  }
  return perDay
}

// همه‌ی بازی‌های تمرینی تموم‌شده‌ی این بازیکن
export function countFinishedPracticeGames(playerKey) {
  let total = 0
  for (const n of practiceGamesByDay(playerKey, '0000-00-00', '9999-99-99').values()) total += n
  return total
}
