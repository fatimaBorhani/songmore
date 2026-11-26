// تیکه‌های روزانه‌ی «شعر یادت نره»: هر روز ۳ تیکه که برای همه یکیه.
// هر تاریخ یه بار انتخاب و توی جدول lyrics_daily ذخیره می‌شه.
// آهنگ‌های امروزِ جورزیک هیچ‌وقت نمیان (اینجا اسم آهنگ دیده می‌شه و جواب اون بازی لو می‌رفت).
import { db } from '../../core/db.js'
import { allPuzzles } from './puzzles.js'

export const DAILY_LYRICS_COUNT = 3

function savedIds(date) {
  return db.prepare('SELECT puzzle_id FROM lyrics_daily WHERE date = ? ORDER BY slot').all(date).map((r) => r.puzzle_id)
}

// شناسه‌ی آهنگ‌های امروزِ جورزیک (اگه هنوز انتخاب نشدن، خالی)
function todaysSongIds(date) {
  return new Set(db.prepare('SELECT song_id FROM daily_songs WHERE date = ?').all(date).map((r) => r.song_id))
}

// تیکه‌های این تاریخ به ترتیب؛ اگه هنوز انتخاب نشدن، اون‌هایی که کمتر از همه اومدن
export function getDailyLyrics(date) {
  const saved = savedIds(date)
  const need = DAILY_LYRICS_COUNT - saved.length
  if (need <= 0) return saved

  const used = new Map()
  for (const row of db.prepare('SELECT puzzle_id, COUNT(*) AS n FROM lyrics_daily GROUP BY puzzle_id').all()) {
    used.set(row.puzzle_id, row.n)
  }
  const blocked = todaysSongIds(date)
  const taken = new Set(saved)
  const pool = allPuzzles().filter((p) => !taken.has(p.id) && !(p.songId && blocked.has(p.songId)))
  // کمتر تکرارشده‌ها اول، بین مساوی‌ها تصادفی
  const picked = pool
    .map((p) => ({ id: p.id, n: used.get(p.id) ?? 0, r: Math.random() }))
    .sort((a, b) => a.n - b.n || a.r - b.r)
    .slice(0, need)

  const insert = db.prepare('INSERT OR IGNORE INTO lyrics_daily (date, slot, puzzle_id) VALUES (?, ?, ?)')
  picked.forEach((p, i) => insert.run(date, saved.length + i + 1, p.id))
  return savedIds(date)
}

// فقط حالت تست: تیکه‌های امروز رو از نو انتخاب می‌کنه
export function pickNewRandomLyrics(date) {
  db.prepare('DELETE FROM lyrics_daily WHERE date = ?').run(date)
  return getDailyLyrics(date)
}
