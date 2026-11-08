// تست اصلاح خواننده‌ها از فایل CSV: خوندن فایل، اعمال روی آهنگ‌ها و خطا برای غلط تایپی
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyArtistOverrides, loadArtistOverrides, parseCsv } from '../../games/song/artistOverrides.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const artists = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
const songs = () => [
  { id: 's1', title: 'One', credit: 'A', artists: [{ id: 'a', role: 'main' }] },
  { id: 's2', title: 'Two', credit: 'B', artists: [{ id: 'b', role: 'main' }] },
]

test('parseCsv: ویرگول و نقل‌قول توی متن، CRLF و BOM', () => {
  const text = '﻿song_id,credit\r\ns1,"A, B & C"\r\ns2,"He said ""hi"""\r\n\r\n'
  assert.deepEqual(parseCsv(text), [
    { song_id: 's1', credit: 'A, B & C' },
    { song_id: 's2', credit: 'He said "hi"' },
  ])
})

test('loadArtistOverrides: نقش پیش‌فرض main است و فایل نبود یعنی بدون اصلاح', () => {
  const file = path.join(fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'ov-')), 'o.csv')
  fs.writeFileSync(file, 'song_id,title,add_artists,credit\ns1,One,b:featured; c,"A, B & C"\ns2,Two,,\n')
  assert.deepEqual(loadArtistOverrides(file), [
    { songId: 's1', credit: 'A, B & C', artists: [{ id: 'b', role: 'featured' }, { id: 'c', role: 'main' }] },
    { songId: 's2', credit: '', artists: [] },
  ])
  assert.deepEqual(loadArtistOverrides(file + '.nope'), [])
})

test('نقش اشتباه خطا می‌ده', () => {
  const file = path.join(fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'ov-')), 'o.csv')
  fs.writeFileSync(file, 'song_id,add_artists,credit\ns1,b:boss,\n')
  assert.throws(() => loadArtistOverrides(file), /نقش/)
})

test('خواننده‌ی جدید اضافه می‌شه و credit عوض می‌شه، بقیه‌ی آهنگ‌ها دست نمی‌خورن', () => {
  const input = songs()
  const out = applyArtistOverrides(
    input,
    [{ songId: 's1', credit: 'A & C', artists: [{ id: 'c', role: 'main' }] }],
    artists
  )
  assert.deepEqual(out[0].artists, [{ id: 'a', role: 'main' }, { id: 'c', role: 'main' }])
  assert.equal(out[0].credit, 'A & C')
  assert.deepEqual(out[1], input[1])
  assert.deepEqual(input, songs(), 'ورودی نباید عوض بشه')
})

test('خواننده‌ی تکراری دوباره اضافه نمی‌شه و بدون credit، credit قبلی می‌مونه', () => {
  const out = applyArtistOverrides(
    songs(),
    [{ songId: 's1', credit: '', artists: [{ id: 'a', role: 'featured' }, { id: 'b', role: 'main' }] }],
    artists
  )
  assert.deepEqual(out[0].artists, [{ id: 'a', role: 'main' }, { id: 'b', role: 'main' }])
  assert.equal(out[0].credit, 'A')
})

test('آهنگ یا خواننده‌ی ناموجود و آهنگ تکراری خطا می‌ده', () => {
  const one = (o) => () => applyArtistOverrides(songs(), o, artists)
  assert.throws(one([{ songId: 'zzz', credit: '', artists: [] }]), /آهنگ zzz/)
  assert.throws(one([{ songId: 's1', credit: '', artists: [{ id: 'nope', role: 'main' }] }]), /nope/)
  assert.throws(
    one([
      { songId: 's1', credit: '', artists: [] },
      { songId: 's1', credit: '', artists: [] },
    ]),
    /دو بار/
  )
})

test('فایل واقعی tools/artist_overrides.csv با داده‌ی واقعی جور است (غلط تایپی نداره)', () => {
  const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf-8'))
  const overrides = loadArtistOverrides(path.join(ROOT, 'tools', 'artist_overrides.csv'))
  assert.ok(overrides.length > 0)
  const out = applyArtistOverrides(read('data/songs.json'), overrides, read('data/artists.json'))
  const bargard = out.find((s) => s.id === '3097c868')
  assert.deepEqual(
    bargard.artists.map((a) => a.id),
    ['sijal', 'sami-beigi', 'behzad-leito']
  )
})
