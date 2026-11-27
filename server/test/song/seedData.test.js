// تست فایل‌های داده‌ی واقعی (data/songs.json، artists.json، clip_map.json) و خود اسکریپت seed.
// هدف: اگه یه اسکریپت داده یکی از این فایل‌ها رو ناقص یا ناجور نوشت، قبل از commit معلوم بشه.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ROOT = path.join(SERVER, '..')
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf-8'))

const songs = readJson('songs.json')
const artists = readJson('artists.json')
const clipMap = readJson('clip_map.json')
const STAGES = ['0.15', '0.5', '2', '8', '15']

test('songs.json: هر آهنگ شناسه‌ی یکتا، عنوان، credit، اسم فایل و حداقل یه خواننده داره', () => {
  const seen = new Set()
  for (const s of songs) {
    assert.ok(s.id && typeof s.id === 'string', `آهنگ بدون شناسه: ${JSON.stringify(s).slice(0, 80)}`)
    assert.equal(seen.has(s.id), false, `شناسه‌ی تکراری: ${s.id}`)
    seen.add(s.id)
    assert.ok(s.title, `آهنگ ${s.id} عنوان نداره`)
    assert.ok(s.credit, `آهنگ ${s.id} credit نداره`)
    assert.ok(s.file_name, `آهنگ ${s.id} اسم فایل نداره`)
    assert.ok(Array.isArray(s.artists) && s.artists.length > 0, `آهنگ ${s.id} خواننده نداره`)
  }
})

test('artists.json: شناسه‌ها یکتا هستن و همه‌ی خواننده‌های آهنگ‌ها توش هستن', () => {
  const ids = new Set()
  for (const a of artists) {
    assert.ok(a.id && a.name, `خواننده‌ی ناقص: ${JSON.stringify(a).slice(0, 80)}`)
    assert.equal(ids.has(a.id), false, `خواننده‌ی تکراری: ${a.id}`)
    ids.add(a.id)
    assert.ok(a.aliases === undefined || Array.isArray(a.aliases), `aliases خواننده‌ی ${a.id} باید لیست باشه`)
  }
  for (const s of songs) {
    for (const a of s.artists) {
      assert.ok(ids.has(a.id), `خواننده‌ی «${a.id}» (آهنگ ${s.id}) توی artists.json نیست`)
      assert.ok(['main', 'featured'].includes(a.role), `نقش ناشناخته «${a.role}» توی آهنگ ${s.id}`)
    }
  }
})

test('clip_map.json: هر ورودی مال یه آهنگ واقعیه و دقیقاً ۵ مرحله با اسم فایل داره', () => {
  const songIds = new Set(songs.map((s) => s.id))
  for (const [songId, clips] of Object.entries(clipMap)) {
    assert.ok(songIds.has(songId), `clip_map آهنگی داره که توی songs.json نیست: ${songId}`)
    assert.deepEqual(Object.keys(clips).sort(), [...STAGES].sort(), `مرحله‌های آهنگ ${songId} کامل نیست`)
    for (const name of Object.values(clips)) assert.equal(typeof name, 'string')
  }
})

test('clip_map.json: اسم کلیپ‌ها یکتا و تصادفی‌ان (هیچ اسمی عنوان یا خواننده‌ی آهنگ رو لو نمی‌ده)', () => {
  const all = Object.values(clipMap).flatMap((clips) => Object.values(clips))
  assert.equal(new Set(all).size, all.length, 'دو کلیپ یه اسم دارن')
  for (const name of all) assert.match(name, /^[0-9a-f]{16}\.mp3$/, `اسم کلیپ تصادفی نیست: ${name}`)
})

test('npm run seed روی داده‌ی واقعی: فقط آهنگ‌های کلیپ‌دار وارد می‌شن، هر کدوم با ۵ کلیپ', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'songmore-seed-'))
  const dbPath = path.join(dir, 'seed.db')
  try {
    const run = () =>
      execFileSync(process.execPath, ['games/song/seed.js'], {
        cwd: SERVER,
        env: { ...process.env, DB_PATH: dbPath, NODE_ENV: 'test' },
        encoding: 'utf-8',
      })
    const expected = songs.filter((s) => clipMap[s.id]).length
    assert.ok(expected > 0)
    assert.ok(run().includes(String(expected)))
    run() // اجرای دوباره نباید چیزی رو تکراری یا خراب کنه

    const db = new Database(dbPath, { readonly: true })
    const count = (sql) => db.prepare(sql).get().n
    assert.equal(count('SELECT COUNT(*) AS n FROM songs'), expected)
    assert.equal(count('SELECT COUNT(*) AS n FROM clips'), expected * STAGES.length)
    assert.equal(count('SELECT COUNT(*) AS n FROM artists'), artists.length)
    // هر آهنگ حداقل یه خواننده داره و همه‌ی خواننده‌هاش واقعاً وجود دارن
    assert.equal(count('SELECT COUNT(*) AS n FROM songs s WHERE NOT EXISTS (SELECT 1 FROM song_artists sa WHERE sa.song_id = s.id)'), 0)
    assert.equal(count('SELECT COUNT(*) AS n FROM song_artists sa WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = sa.artist_id)'), 0)
    db.close()
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
