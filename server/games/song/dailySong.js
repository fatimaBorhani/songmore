// انتخاب آهنگ‌های روزانه بر اساس تاریخ تهران (نیمه‌شب عوض می‌شه)
import { db } from '../../core/db.js'

// تاریخ امروز حالا توی core/today.js مشترکه؛ برای کدهای قبلی از اینجا هم در دسترسه
export { getTodayDateString } from '../../core/today.js'

// هر روز چند آهنگ مسابقه‌ای (تست‌ها با متغیر DAILY_SONG_COUNT می‌تونن عوضش کنن)
export const DAILY_SONG_COUNT = Number(process.env.DAILY_SONG_COUNT) || 3

function savedSongIds(dateString) {
  return db
    .prepare('SELECT song_id FROM daily_songs WHERE date = ? ORDER BY slot')
    .all(dateString)
    .map((r) => r.song_id)
}

// آهنگ‌های این تاریخ به ترتیب (آهنگ ۱ تا ۳)؛ برای همه‌ی بازیکن‌ها یکیه.
// اگه هنوز انتخاب نشده، آهنگ‌هایی که کمتر از همه تکرار شدن (و تکراری نیستن) انتخاب و ذخیره می‌شن.
// اگه کمتر از ۳ آهنگ توی دیتابیس باشه، همون‌قدر آهنگ داریم.
export function pickDailySongs(dateString) {
  const saved = savedSongIds(dateString)
  const need = DAILY_SONG_COUNT - saved.length
  if (need <= 0) return saved

  const rows = db
    .prepare(
      `SELECT s.id FROM songs s
       LEFT JOIN daily_songs d ON d.song_id = s.id
       WHERE s.id NOT IN (SELECT song_id FROM daily_songs WHERE date = ?)
       GROUP BY s.id
       ORDER BY COUNT(d.date) ASC, RANDOM()
       LIMIT ?`
    )
    .all(dateString, need)

  if (saved.length === 0 && rows.length === 0) throw new Error('هیچ آهنگی توی دیتابیس نیست؛ اول seed رو بزن')

  const insert = db.prepare('INSERT INTO daily_songs (date, slot, song_id) VALUES (?, ?, ?)')
  rows.forEach((row, i) => insert.run(dateString, saved.length + i + 1, row.id))
  return savedSongIds(dateString)
}

// فقط برای تست (حالت --random-song): آهنگ‌های امروز رو با ۳ آهنگ تصادفی جدید عوض می‌کنه
export function pickNewRandomSongs(dateString) {
  const rows = db.prepare('SELECT id FROM songs ORDER BY RANDOM() LIMIT ?').all(DAILY_SONG_COUNT)
  if (rows.length === 0) throw new Error('هیچ آهنگی توی دیتابیس نیست؛ اول seed رو بزن')
  db.prepare('DELETE FROM daily_songs WHERE date = ?').run(dateString)
  const insert = db.prepare('INSERT INTO daily_songs (date, slot, song_id) VALUES (?, ?, ?)')
  rows.forEach((row, i) => insert.run(dateString, i + 1, row.id))
  return savedSongIds(dateString)
}
