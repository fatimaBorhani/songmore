// اصلاح دستی خواننده‌ی بعضی آهنگ‌ها، بدون دست زدن به data/songs.json.
// فایل tools/artist_overrides.csv برای هر آهنگ می‌گه چه خواننده‌هایی اضافه بشن
// (مثلاً وقتی اسم فایل فقط خواننده‌ی اول رو داشت ولی تگ mp3 چند نفر رو نشون می‌داد)
// و اگه خواستیم، متن زیر آهنگ (credit) رو هم عوض می‌کنه.
//
// ستون‌ها: song_id, title (فقط برای خوانا بودن فایل)، add_artists (مثل «sami-beigi:main; behzad-leito:main»)، credit (اختیاری)
import fs from 'node:fs'

const ROLES = new Set(['main', 'featured'])

// خوندن CSV ساده (با پشتیبانی از "..." و ویرگول توی متن) -> آرایه‌ای از آبجکت‌ها با کلید اسم ستون
export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const input = text.replace(/^﻿/, '') // BOM که اکسل اضافه می‌کنه
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }

  const [header = [], ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''))
  return body.map((r) => Object.fromEntries(header.map((name, i) => [name.trim(), (r[i] ?? '').trim()])))
}

// فایل رو می‌خونه و به [{ songId, artists: [{id, role}], credit }] تبدیل می‌کنه.
// اگه فایل نبود، لیست خالی (هیچ اصلاحی انجام نمی‌شه).
export function loadArtistOverrides(filePath) {
  if (!fs.existsSync(filePath)) return []
  return parseCsv(fs.readFileSync(filePath, 'utf-8'))
    .filter((r) => r.song_id)
    .map((r) => ({
      songId: r.song_id,
      credit: r.credit || '',
      artists: r.add_artists
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [id, role = 'main'] = part.split(':').map((x) => x.trim())
          if (!ROLES.has(role)) throw new Error(`artist_overrides: نقش «${role}» برای ${r.song_id} درست نیست`)
          return { id, role }
        }),
    }))
}

// اصلاح‌ها رو روی لیست آهنگ‌ها اعمال می‌کنه و یه لیست جدید برمی‌گردونه (ورودی عوض نمی‌شه).
// اگه آهنگ یا خواننده‌ای وجود نداشته باشه خطا می‌ده تا غلط تایپی بی‌صدا رد نشه.
export function applyArtistOverrides(songs, overrides, artists) {
  const songIds = new Set(songs.map((s) => s.id))
  const artistIds = new Set(artists.map((a) => a.id))
  const bySong = new Map()
  for (const o of overrides) {
    if (!songIds.has(o.songId)) throw new Error(`artist_overrides: آهنگ ${o.songId} توی songs.json نیست`)
    if (bySong.has(o.songId)) throw new Error(`artist_overrides: آهنگ ${o.songId} دو بار اومده`)
    for (const a of o.artists) {
      if (!artistIds.has(a.id)) throw new Error(`artist_overrides: خواننده‌ی ${a.id} توی artists.json نیست`)
    }
    bySong.set(o.songId, o)
  }

  return songs.map((song) => {
    const o = bySong.get(song.id)
    if (!o) return song
    const have = new Set(song.artists.map((a) => a.id))
    return {
      ...song,
      artists: [...song.artists, ...o.artists.filter((a) => !have.has(a.id))],
      credit: o.credit || song.credit,
    }
  })
}
