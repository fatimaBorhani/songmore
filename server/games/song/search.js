// جستجوی آهنگ با اسم خواننده (فارسی/انگلیسی/alias) یا عنوان آهنگ.
// برای اینکه کل فهرست آهنگ‌ها با چند حرف لو نره:
// حداقل ۲ حرف، فقط از اول یه کلمه (نه وسط کلمه) و حداکثر ۸ نتیجه
import { db } from '../../core/db.js'
import { normalizePersian } from '../../core/normalize.js'

export const MIN_QUERY_LENGTH = 2
export const MAX_RESULTS = 8

// آیا جستجو از اول یکی از کلمه‌های این متن شروع می‌شه؟
// («حامدی» توی «ابراهیم حامدی» آره، «امدی» نه)؛ فاصله‌ها مهم نیستن («mosafer e shab» = «mosafereshab»)
function matchesWordStart(text, q) {
  if (!text) return false
  // نیم‌فاصله جزو کلمه‌ست (می‌خواهمت یه کلمه‌ست)
  const words = text.split(/[^\p{L}\p{N}\p{M}\u200c]+/u).filter(Boolean)
  return words.some((_, i) => normalizePersian(words.slice(i).join('')).startsWith(q))
}

export function searchSongs(query) {
  const q = normalizePersian(query)
  if (q.length < MIN_QUERY_LENGTH) return []

  const artists = db.prepare('SELECT * FROM artists').all()
  const matchedArtistIds = new Set(
    artists
      .filter((a) => {
        const names = [a.name, a.persian, ...JSON.parse(a.aliases)]
        return names.some((n) => matchesWordStart(n, q))
      })
      .map((a) => a.id)
  )

  const rows = db
    .prepare(
      `SELECT s.id, s.title, s.alt_title, s.credit, sa.artist_id, sa.role
       FROM songs s JOIN song_artists sa ON sa.song_id = s.id`
    )
    .all()

  // چون هر آهنگ چند خواننده داره، اول گروه‌بندی بر اساس آهنگ
  const bySong = new Map()
  for (const row of rows) {
    if (!bySong.has(row.id)) {
      bySong.set(row.id, {
        id: row.id,
        title: row.title,
        altTitle: row.alt_title,
        credit: row.credit,
        roles: [],
      })
    }
    bySong.get(row.id).roles.push({ artistId: row.artist_id, role: row.role })
  }

  const results = []
  for (const song of bySong.values()) {
    const titleMatch = matchesWordStart(song.title, q) || matchesWordStart(song.altTitle, q)
    const matchedRoles = song.roles.filter((r) => matchedArtistIds.has(r.artistId))
    if (titleMatch || matchedRoles.length > 0) {
      const isMainMatch = matchedRoles.some((r) => r.role === 'main')
      results.push({
        id: song.id,
        title: song.title,
        altTitle: song.altTitle,
        credit: song.credit,
        // اول: عنوان یا خواننده‌ی اصلی؛ بعد: فقط همکاری (feat)
        first: titleMatch || isMainMatch,
      })
    }
  }

  // آهنگ‌هایی که عنوان یا خواننده‌ی اصلیشون می‌خونه اول بیان
  results.sort((a, b) => Number(b.first) - Number(a.first))
  return results.slice(0, MAX_RESULTS).map(({ id, title, altTitle, credit }) => ({ id, title, altTitle, credit }))
}
