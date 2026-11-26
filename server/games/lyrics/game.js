// وضعیت بازی «شعر یادت نره» برای هر بازیکن: هر روز ۳ تیکه، یکی‌یکی.
// برای هر تیکه بازیکن یه بار دو خط می‌نویسه (جدول lyrics_answers). نمره‌ها ذخیره نمی‌شن
// و هر بار از روی متن واقعی حساب می‌شن.
// جواب (دو خط) و کلیپ بعدش فقط وقتی همون تیکه تموم شده به کلاینت می‌رسه.
import { db } from '../../core/db.js'
import { getDailyLyrics } from './daily.js'
import { getPuzzle } from './puzzles.js'
import { gradeLine, MAX_POINTS_PER_SONG, POINTS } from './grade.js'

export const MAX_LINE_LENGTH = 120

const clipUrl = (file) => `/clips/${file}`

function answersOf(playerKey, date) {
  const rows = db.prepare('SELECT slot, line1, line2 FROM lyrics_answers WHERE player_key = ? AND date = ?').all(playerKey, date)
  return new Map(rows.map((r) => [r.slot, r]))
}

// یه تیکه برای کلاینت؛ قبل از جواب دادن فقط خط‌های قبل از سؤال و کلیپ اول
function slotView(slot, puzzle, answer) {
  const base = {
    slot,
    title: puzzle.title,
    artist: puzzle.artist,
    clipBefore: clipUrl(puzzle.clipBefore),
    questionAtMs: puzzle.questionAtMs,
    endMs: puzzle.endMs,
    answerIndex: puzzle.answerIndex,
  }
  if (!answer) {
    return { ...base, finished: false, lines: puzzle.lines.slice(0, puzzle.answerIndex) }
  }
  const typed = [answer.line1, answer.line2]
  const grades = typed.map((t, i) => gradeLine(t, puzzle.lines[puzzle.answerIndex + i].text))
  const points = grades.reduce((sum, g) => sum + POINTS[g], 0)
  return { ...base, finished: true, lines: puzzle.lines, clipAfter: clipUrl(puzzle.clipAfter), typed, grades, points }
}

export function getLyricsState(playerKey, date) {
  const ids = getDailyLyrics(date)
  const answers = answersOf(playerKey, date)
  const slots = []
  ids.forEach((id, i) => {
    const puzzle = getPuzzle(id)
    if (puzzle) slots.push(slotView(i + 1, puzzle, answers.get(i + 1)))
  })
  const current = slots.find((s) => !s.finished)
  return {
    date,
    songCount: slots.length,
    slot: current ? current.slot : null,
    slots,
    dayPoints: slots.reduce((sum, s) => sum + (s.points ?? 0), 0),
    maxPoints: slots.length * MAX_POINTS_PER_SONG,
    dayFinished: slots.length > 0 && !current,
  }
}

const clean = (text) => (typeof text === 'string' ? text.trim() : '')

// جواب تیکه‌ی جاری؛ خطا رو به شکل رشته برمی‌گردونه
export function submitLyricsAnswer(playerKey, date, body) {
  const state = getLyricsState(playerKey, date)
  if (state.dayFinished || state.slot === null) return 'GAME_OVER'
  if (body?.slot !== state.slot) return 'NOT_CURRENT'
  const line1 = clean(body.line1)
  const line2 = clean(body.line2)
  if (!line1 && !line2) return 'EMPTY_ANSWER'
  if (line1.length > MAX_LINE_LENGTH || line2.length > MAX_LINE_LENGTH) return 'ANSWER_TOO_LONG'
  db.prepare(
    'INSERT OR IGNORE INTO lyrics_answers (player_key, date, slot, line1, line2, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(playerKey, date, state.slot, line1, line2, Date.now())
  return null
}

// فقط حالت تست: جواب‌های امروزِ همه پاک می‌شه
export function clearLyricsGames(date) {
  db.prepare('DELETE FROM lyrics_answers WHERE date = ?').run(date)
}
