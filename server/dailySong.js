// انتخاب آهنگ روزانه بر اساس تاریخ تهران (نیمه‌شب عوض می‌شه)
import { db } from './db.js'

export function getTodayDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type).value
  return `${get('year')}-${get('month')}-${get('day')}`
}

// اگه برای این تاریخ قبلاً آهنگ انتخاب شده، همونو برمی‌گردونه.
// وگرنه آهنگی که کمتر از همه تکرار شده رو انتخاب و ذخیره می‌کنه.
export function pickDailySong(dateString) {
  const existing = db.prepare('SELECT song_id FROM daily_song WHERE date = ?').get(dateString)
  if (existing) return existing.song_id

  const row = db
    .prepare(
      `SELECT s.id FROM songs s
       LEFT JOIN daily_song d ON d.song_id = s.id
       GROUP BY s.id
       ORDER BY COUNT(d.date) ASC, RANDOM()
       LIMIT 1`
    )
    .get()

  if (!row) throw new Error('هیچ آهنگی توی دیتابیس نیست؛ اول seed رو بزن')

  db.prepare('INSERT INTO daily_song (date, song_id) VALUES (?, ?)').run(dateString, row.id)
  return row.id
}
