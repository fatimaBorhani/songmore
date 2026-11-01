// دیتابیس رو از data/songs.json + data/artists.json + data/clip_map.json پر می‌کنه.
// فقط آهنگ‌هایی که توی clip_map.json کلیپ دارن وارد بازی می‌شن (یعنی واقعاً mp3 دارن).
// اجرا: node server/seed.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

function readJson(relPath, fallback = null) {
  const full = path.join(ROOT, relPath)
  if (!fs.existsSync(full)) return fallback
  return JSON.parse(fs.readFileSync(full, 'utf-8'))
}

const songs = readJson('data/songs.json', [])
const artists = readJson('data/artists.json', [])
const clipMap = readJson('data/clip_map.json', {})

const insertArtist = db.prepare(
  'INSERT OR REPLACE INTO artists (id, name, persian, aliases) VALUES (?, ?, ?, ?)'
)
const insertSong = db.prepare(
  'INSERT OR REPLACE INTO songs (id, title, alt_title, credit, file_name) VALUES (?, ?, ?, ?, ?)'
)
const deleteSongArtists = db.prepare('DELETE FROM song_artists WHERE song_id = ?')
const insertSongArtist = db.prepare(
  'INSERT OR REPLACE INTO song_artists (song_id, artist_id, role) VALUES (?, ?, ?)'
)
const insertClip = db.prepare(
  'INSERT OR REPLACE INTO clips (song_id, stage, file_name) VALUES (?, ?, ?)'
)

const seed = db.transaction(() => {
  for (const a of artists) {
    insertArtist.run(a.id, a.name, a.persian ?? null, JSON.stringify(a.aliases ?? []))
  }

  let songCount = 0
  for (const s of songs) {
    const clips = clipMap[s.id]
    if (!clips) continue // هنوز کلیپ نداره، فعلاً وارد بازی نمی‌شه

    insertSong.run(s.id, s.title, s.alt_title || null, s.credit, s.file_name)
    deleteSongArtists.run(s.id)
    for (const a of s.artists) {
      insertSongArtist.run(s.id, a.id, a.role)
    }
    for (const [stage, fileName] of Object.entries(clips)) {
      insertClip.run(s.id, stage, fileName)
    }
    songCount++
  }
  return songCount
})

const count = seed()
console.log(`✓ ${count} آهنگ توی دیتابیس seed شد (از ${songs.length} ردیف songs.json)`)
