// تعیین نتیجه‌ی یه حدس: درست / خواننده‌ی مشترک / غلط
import { db } from './db.js'

export function buildSongArtistsMap() {
  const rows = db.prepare('SELECT song_id, artist_id FROM song_artists').all()
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.song_id)) map.set(row.song_id, new Set())
    map.get(row.song_id).add(row.artist_id)
  }
  return map
}

export function evaluateGuess(guessSongId, dailySongId, songArtistsMap) {
  if (guessSongId === dailySongId) return 'correct'
  const guessArtists = songArtistsMap.get(guessSongId) ?? new Set()
  const dailyArtists = songArtistsMap.get(dailySongId) ?? new Set()
  const sharedArtist = [...guessArtists].some((id) => dailyArtists.has(id))
  return sharedArtist ? 'present' : 'incorrect'
}
