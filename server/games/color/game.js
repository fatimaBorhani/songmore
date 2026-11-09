// ذخیره‌ی حدس‌ها و ساخت وضعیت بازی حافظه‌ی رنگ برای کلاینت.
// مهم: رنگ اصلی هر دور فقط بعد از ثبت حدس اون دور توی وضعیت میاد. رنگ دور جاری فقط با
// getCurrentRoundColor (یعنی وقتی بازیکن «شروع» رو می‌زنه) داده می‌شه و دورهای بعدی هیچ‌وقت زودتر لو نمی‌رن.
import { db } from '../../core/db.js'
import { getDailyColors } from './daily.js'
import { evaluateRound, MAX_ROUND_SCORE, MEMORIZE_SECONDS, ROUNDS } from './scoring.js'

function getGuesses(playerKey, date) {
  return db
    .prepare('SELECT round, h, s, b FROM color_guesses WHERE player_key = ? AND date = ? ORDER BY round')
    .all(playerKey, date)
}

export function clearColorGame(playerKey, date) {
  db.prepare('DELETE FROM color_guesses WHERE player_key = ? AND date = ?').run(playerKey, date)
}

export function getColorState(playerKey, date) {
  const targets = getDailyColors(date)
  const rounds = getGuesses(playerKey, date).map((g) => evaluateRound(targets[g.round - 1], g, g.round))
  const total = Math.round(rounds.reduce((sum, r) => sum + r.score, 0) * 100) / 100
  return {
    date,
    roundCount: ROUNDS,
    memorizeSeconds: MEMORIZE_SECONDS,
    completed: rounds.length,
    finished: rounds.length >= ROUNDS,
    rounds,
    total,
    maxTotal: ROUNDS * MAX_ROUND_SCORE,
  }
}

// رنگ دور جاری (برای نشون دادن موقع حفظ کردن)، یا null اگه بازی تموم شده
export function getCurrentRoundColor(playerKey, date) {
  const completed = getGuesses(playerKey, date).length
  if (completed >= ROUNDS) return null
  return { round: completed + 1, color: getDailyColors(date)[completed] }
}

// رنگ بازیکن برای دور جاری رو ثبت می‌کنه؛ اگه همزمان دو بار فرستاده بشه، دومی نادیده گرفته می‌شه
export function addColorGuess(playerKey, date, { h, s, b }) {
  const completed = getGuesses(playerKey, date).length
  if (completed >= ROUNDS) throw new Error('GAME_OVER')
  db.prepare(
    'INSERT OR IGNORE INTO color_guesses (player_key, date, round, h, s, b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(playerKey, date, completed + 1, h, s, b, Date.now())
}

// h بین ۰ تا ۳۶۰ (۳۶۰ همون ۰ حساب می‌شه)، s و b بین ۰ تا ۱۰۰؛ همه عدد صحیح. غیر از اینا null
export function parseColorInput(body) {
  const { h, s, b } = body || {}
  const ok = (v, max) => Number.isInteger(v) && v >= 0 && v <= max
  if (!ok(h, 360) || !ok(s, 100) || !ok(b, 100)) return null
  return { h: h % 360, s, b }
}
