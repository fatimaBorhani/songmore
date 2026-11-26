// داده‌ی بازی «شعر یادت نره»: هر «تیکه» یه بخش از یه آهنگه با متن هم‌زمانش.
// فایلش (data/lyrics/lyrics_game.json) خروجی tools/build_lyrics_game.py است و توی git نمی‌ره
// (متن ترانه‌ها مال خودمون نیست). مسیرش رو می‌شه با LYRICS_GAME_PATH عوض کرد (تست‌ها همین کار رو می‌کنن).
//
// شکل هر تیکه:
//   { id, songId, title, artist, clipBefore, clipAfter, questionAtMs, endMs, answerIndex,
//     lines: [{ ms, text }] }
// زمان‌ها میلی‌ثانیه از اول clipBefore هستن؛ clipAfter دقیقاً از questionAtMs ادامه می‌ده.
// خط‌های answerIndex و answerIndex + 1 همون دو خطی‌ان که بازیکن باید بنویسه.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const DATA_PATH = process.env.LYRICS_GAME_PATH || path.join(ROOT, 'data', 'lyrics', 'lyrics_game.json')

let cache = null // { mtime, list, byId }

// یه تیکه درسته؟ (فایل دستی خراب نشده باشه)
function isValidPuzzle(p) {
  if (!p || typeof p.id !== 'string' || !Array.isArray(p.lines)) return false
  if (typeof p.clipBefore !== 'string' || typeof p.clipAfter !== 'string') return false
  const a = p.answerIndex
  if (!Number.isInteger(a) || a < 1 || a + 1 >= p.lines.length) return false
  return p.lines.every((l) => typeof l.text === 'string' && Number.isFinite(l.ms))
}

// فایل رو می‌خونه؛ اگه عوض شده باشه دوباره (بدون ری‌استارت سرور)
function load() {
  let stat
  try {
    stat = fs.statSync(DATA_PATH)
  } catch {
    cache = null
    return null
  }
  if (cache && cache.mtime === stat.mtimeMs) return cache
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  const list = (raw.puzzles || []).filter(isValidPuzzle)
  cache = { mtime: stat.mtimeMs, list, byId: new Map(list.map((p) => [p.id, p])) }
  return cache
}

export function hasLyricsData() {
  const data = load()
  return !!data && data.list.length > 0
}

export function allPuzzles() {
  return load()?.list ?? []
}

export function getPuzzle(id) {
  return load()?.byId.get(id) ?? null
}
