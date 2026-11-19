// جدول هفته: امتیاز یکسان برای همه‌ی بازی‌ها، از شنبه تا جمعه (به وقت تهران). فقط کاربرهای واردشده.
// هیچ‌چیز جدا ذخیره نمی‌شه؛ هر بار از روی حدس‌های ذخیره‌شده‌ی هر بازی حساب می‌شه.
//
// قانون امتیاز (برای هر بازی، هر روز، فقط اگه بازی اون روز رو تموم کرده باشی):
//   تموم کردن ۱۰ امتیاز، برد ۱۰ امتیاز دیگه، عالی ۱۰ امتیاز دیگه (یعنی هر بازی حداکثر ۳۰ در روز)
//   حدس آهنگ:    تموم = هر ۳ آهنگ تموم شده، برد = حداقل ۲ آهنگ درست، عالی = هر ۳ درست
//   واژه‌یاب:     تموم = هر ۳ کلمه تموم شده، برد = حداقل ۲ کلمه توی ۶ حدس، عالی = هر ۳
//   حافظه‌ی رنگ:  تموم = هر ۵ دور، برد = جمع حداقل ۳۰ از ۵۰، عالی = حداقل ۴۰
//   کلمه‌ی پنهان: تموم = پیدا کرده یا تسلیم شده، برد = پیدا کرده، عالی = بدون راهنما و با ۲۰ حدس یا کمتر
import { db } from '../../core/db.js'
import { computeScore } from '../song/scoring.js'
import { getWordGameState } from '../word/game.js'
import { getColorState } from '../color/game.js'

export const POINTS = { finish: 10, win: 10, great: 10 }
export const GAME_IDS = ['song', 'word', 'color', 'clue']
export const COLOR_WIN = 30
export const COLOR_GREAT = 40
export const CLUE_GREAT_GUESSES = 20
export const TOP_SIZE = 50

const DAY_MS = 24 * 3600 * 1000
const toDate = (s) => new Date(`${s}T00:00:00Z`)
const fromDate = (d) => d.toISOString().slice(0, 10)

// ۷ روز هفته‌ای که این تاریخ توشه (شنبه تا جمعه)
export function weekDates(today) {
  const d = toDate(today)
  const sinceSaturday = (d.getUTCDay() + 1) % 7 // شنبه = ۶ توی getUTCDay
  const start = d.getTime() - sinceSaturday * DAY_MS
  return Array.from({ length: 7 }, (_, i) => fromDate(new Date(start + i * DAY_MS)))
}

// امتیاز یه روز یه بازی از روی سه شرط
const pointsFor = (finished, win, great) =>
  finished ? POINTS.finish + (win ? POINTS.win : 0) + (great ? POINTS.great : 0) : 0

function songDay(playerKey, date) {
  const songCount = db.prepare('SELECT COUNT(*) AS n FROM daily_songs WHERE date = ?').get(date).n
  if (!songCount) return 0
  const rows = db
    .prepare('SELECT slot, result FROM guesses WHERE session_id = ? AND date = ? ORDER BY slot, guess_number')
    .all(playerKey, date)
  const slots = new Map()
  for (const r of rows) {
    if (!slots.has(r.slot)) slots.set(r.slot, [])
    slots.get(r.slot).push(r)
  }
  const scores = [...slots.values()].map(computeScore)
  const finished = scores.length >= songCount && scores.every((s) => s !== null)
  const wins = scores.filter((s) => s > 0).length
  return pointsFor(finished, wins >= 2, wins >= songCount)
}

function wordDay(playerKey, date) {
  // کلمه‌های همون روز رو مستقیم از جدول می‌خونیم (نه getDailyWords که اگه نبود کلمه‌ی تازه می‌سازه)
  const daily = db.prepare('SELECT length, word FROM word_daily WHERE date = ? ORDER BY length').all(date)
  if (!daily.length) return 0
  const state = getWordGameState(playerKey, date, daily, 0)
  const wins = state.slots.filter((s) => s.won).length
  return pointsFor(state.dayFinished, wins >= 2, wins >= daily.length)
}

function colorDay(playerKey, date) {
  const state = getColorState(playerKey, date)
  return pointsFor(state.finished, state.total >= COLOR_WIN, state.total >= COLOR_GREAT)
}

function clueDay(playerKey, date) {
  const answer = db.prepare('SELECT word FROM clue_daily WHERE date = ?').get(date)?.word
  if (!answer) return 0
  const rows = db.prepare('SELECT word, hint FROM clue_guesses WHERE player_key = ? AND date = ?').all(playerKey, date)
  const found = rows.some((r) => !r.hint && r.word === answer)
  const gaveUp = !!db.prepare('SELECT 1 FROM clue_gaveup WHERE player_key = ? AND date = ?').get(playerKey, date)
  const hints = rows.filter((r) => r.hint).length
  const guesses = rows.length - hints
  return pointsFor(found || gaveUp, found, found && hints === 0 && guesses <= CLUE_GREAT_GUESSES)
}

// برای هر بازی: کسایی که توی این روزها بازی کردن (جدول، ستون بازیکن)
const ACTIVITY = {
  song: ['guesses', 'session_id', songDay],
  word: ['word_guesses', 'player_key', wordDay],
  color: ['color_guesses', 'player_key', colorDay],
  clue: ['clue_guesses', 'player_key', clueDay],
}

// امتیاز هفته‌ی همه‌ی کاربرها: Map از playerKey به { song, word, color, clue, total, games }
function weekPoints(dates) {
  const marks = dates.map(() => '?').join(', ')
  const result = new Map()
  for (const [game, [table, column, dayPoints]] of Object.entries(ACTIVITY)) {
    const rows = db
      .prepare(`SELECT DISTINCT ${column} AS player, date FROM ${table} WHERE date IN (${marks}) AND ${column} LIKE 'user:%'`)
      .all(...dates)
    // کلمه‌ی پنهان: کسی که بدون هیچ حدسی تسلیم شده هم حساب بشه
    if (game === 'clue') {
      rows.push(
        ...db
          .prepare(`SELECT player_key AS player, date FROM clue_gaveup WHERE date IN (${marks}) AND player_key LIKE 'user:%'`)
          .all(...dates)
      )
    }
    const seen = new Set()
    for (const { player, date } of rows) {
      if (seen.has(`${player}|${date}`)) continue
      seen.add(`${player}|${date}`)
      const points = dayPoints(player, date)
      if (!points) continue
      if (!result.has(player)) result.set(player, { song: 0, word: 0, color: 0, clue: 0, total: 0, games: 0 })
      const p = result.get(player)
      p[game] += points
      p.total += points
      p.games += 1
    }
  }
  return result
}

// جدول این هفته. currentUserId: کاربر واردشده یا null
export function getWeeklyBoard(today, currentUserId = null) {
  const dates = weekDates(today)
  const points = weekPoints(dates)
  const users = new Map(
    db.prepare('SELECT id, username FROM users').all().map((u) => [`user:${u.id}`, u])
  )

  const players = [...points.entries()]
    .filter(([key]) => users.has(key))
    .map(([key, p]) => ({ userId: users.get(key).id, username: users.get(key).username, ...p }))
    .sort((a, b) => b.total - a.total || b.games - a.games || a.username.localeCompare(b.username))

  // رتبه: امتیاز مساوی = رتبه‌ی مساوی (۱، ۲، ۲، ۴)
  let lastTotal = null
  let lastRank = 0
  players.forEach((p, i) => {
    if (p.total !== lastTotal) lastRank = i + 1
    p.rank = lastRank
    lastTotal = p.total
  })

  const meRow = currentUserId ? players.find((p) => p.userId === currentUserId) : null
  const breakdown = (p) => ({ song: p.song, word: p.word, color: p.color, clue: p.clue })
  return {
    weekStart: dates[0],
    weekEnd: dates[6],
    today,
    daysLeft: dates.length - 1 - dates.indexOf(today), // چند روز دیگه بعد از امروز
    totalPlayers: players.length,
    // userId به کلاینت نمی‌ره؛ فقط اسم کاربری
    top: players.slice(0, TOP_SIZE).map((p) => ({
      rank: p.rank,
      username: p.username,
      points: p.total,
      games: p.games,
      isMe: p.userId === currentUserId,
    })),
    me: currentUserId
      ? meRow
        ? { rank: meRow.rank, points: meRow.total, games: meRow.games, ...breakdown(meRow) }
        : { rank: null, points: 0, games: 0, song: 0, word: 0, color: 0, clue: 0 }
      : null,
  }
}
