// «آهنگم توی لیست نیست»: بازیکن یه آهنگ پیشنهاد می‌ده که به بازی اضافه بشه. فقط ذخیره می‌شه تا خودمون بررسی کنیم.
// اسم آهنگ لازمه، خواننده اختیاریه. هر بازیکن هر آهنگ رو یه بار (دوباره زدن خطا نیست) و روزی حداکثر ۱۰ تا
import { db } from '../../core/db.js'
import { normalizePersian } from '../../core/normalize.js'

export const MAX_SONG_SUGGESTIONS_PER_DAY = 10
export const MAX_TITLE_LENGTH = 80
export const MAX_ARTIST_LENGTH = 60

// متن رو تمیز می‌کنه: فاصله‌های اضافه حذف (اگه رشته نبود، رشته‌ی خالی)
function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

// کد خطا یا null (یعنی ثبت شد)
export function suggestSong(playerKey, date, rawTitle, rawArtist) {
  const title = clean(rawTitle)
  const artist = clean(rawArtist)
  const titleNorm = normalizePersian(title)
  // حداقل دو حرف یا عدد واقعی (نه فقط علامت)
  if (Array.from(titleNorm).length < 2) return 'INVALID_TITLE'
  if (Array.from(title).length > MAX_TITLE_LENGTH) return 'TITLE_TOO_LONG'
  if (Array.from(artist).length > MAX_ARTIST_LENGTH) return 'ARTIST_TOO_LONG'

  const normKey = `${titleNorm}|${normalizePersian(artist)}`
  const exists = db.prepare('SELECT 1 FROM song_suggestions WHERE player_key = ? AND norm_key = ?').get(playerKey, normKey)
  if (exists) return null
  const today = db.prepare('SELECT COUNT(*) AS n FROM song_suggestions WHERE player_key = ? AND date = ?').get(playerKey, date).n
  if (today >= MAX_SONG_SUGGESTIONS_PER_DAY) return 'TOO_MANY_SUGGESTIONS'
  db.prepare(
    'INSERT INTO song_suggestions (player_key, title, artist, norm_key, date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(playerKey, title, artist, normKey, date, Date.now())
  return null
}
