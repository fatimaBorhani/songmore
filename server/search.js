// جستجوی آهنگ با اسم خواننده (فارسی/انگلیسی/alias) یا عنوان آهنگ
import { db } from './db.js'
import { normalizePersian } from './normalize.js'

export function searchSongs(query) {
  const q = normalizePersian(query)
  if (!q) return []

  const artists = db.prepare('SELECT * FROM artists').all()
  const matchedArtistIds = new Set(
    artists
      .filter((a) => {
        const names = [a.name, a.persian, ...JSON.parse(a.aliases)]
        return names.some((n) => normalizePersian(n).includes(q))
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
    const titleMatch =
      normalizePersian(song.title).includes(q) || normalizePersian(song.altTitle || '').includes(q)
    const matchedRoles = song.roles.filter((r) => matchedArtistIds.has(r.artistId))
    if (titleMatch || matchedRoles.length > 0) {
      const isMainMatch = matchedRoles.some((r) => r.role === 'main')
      results.push({
        id: song.id,
        title: song.title,
        altTitle: song.altTitle,
        credit: song.credit,
        isMainMatch,
      })
    }
  }

  // آهنگ‌هایی که خواننده‌ی اصلیشون با جستجو یکیه اول بیان
  results.sort((a, b) => Number(b.isMainMatch) - Number(a.isMainMatch))
  return results.map(({ id, title, altTitle, credit }) => ({ id, title, altTitle, credit }))
}
