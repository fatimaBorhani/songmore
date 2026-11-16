// تست جستجوی آهنگ: اسم فارسی/انگلیسی/alias خواننده، عنوان، نرمال‌سازی و ترتیب (اصلی قبل از همکاری)
import { test, before } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { searchSongs } = await import('../../games/song/search.js')

before(() => {
  const artist = db.prepare('INSERT INTO artists (id, name, persian, aliases) VALUES (?, ?, ?, ?)')
  artist.run('ebi', 'Ebi', 'ابی', JSON.stringify(['Ebrahim Hamedi', 'ابراهیم حامدی']))
  artist.run('shadmehr', 'Shadmehr Aghili', 'شادمهر عقیلی', '[]')
  artist.run('kaveh', 'Kaveh Yaghmaei', 'کاوه یغمایی', '[]')
  artist.run('no-persian', 'Zedbazi', null, '[]') // خواننده‌ای که اسم فارسی نداره

  const song = db.prepare('INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES (?, ?, ?, ?, ?)')
  const link = db.prepare('INSERT INTO song_artists (song_id, artist_id, role) VALUES (?, ?, ?)')
  // ترتیب عمدی: آهنگِ همکاری قبل از آهنگ اصلی وارد می‌شه تا معلوم بشه مرتب‌سازی کار می‌کنه
  song.run('s-feat', 'Royaye Ma', null, 'Shadmehr Aghili (feat. Ebi)', 'secret-file-1.mp3')
  link.run('s-feat', 'shadmehr', 'main')
  link.run('s-feat', 'ebi', 'featured')
  song.run('s-ebi', 'Khalij', 'خلیج', 'Ebi', 'secret-file-2.mp3')
  link.run('s-ebi', 'ebi', 'main')
  song.run('s-kaveh', 'Mosafer-e Shab', 'می‌خواهمت', 'Kaveh Yaghmaei', 'secret-file-3.mp3')
  link.run('s-kaveh', 'kaveh', 'main')
  song.run('s-zed', 'Tabestoon Kootahe', null, 'Zedbazi', 'secret-file-4.mp3')
  link.run('s-zed', 'no-persian', 'main')
})

const ids = (q) => searchSongs(q).map((s) => s.id)

test('جستجوی خالی یا فقط علامت چیزی برنمی‌گردونه', () => {
  assert.deepEqual(searchSongs(''), [])
  assert.deepEqual(searchSongs('   '), [])
  assert.deepEqual(searchSongs('!!! ---'), [])
  assert.deepEqual(searchSongs(undefined), [])
})

test('اسم خواننده همه‌ی آهنگ‌هاش رو میاره: اول آهنگ‌های اصلی، بعد همکاری', () => {
  assert.deepEqual(ids('ابی'), ['s-ebi', 's-feat'])
  assert.deepEqual(ids('Ebi'), ['s-ebi', 's-feat'])
})

test('alias فارسی و انگلیسی خواننده هم کار می‌کنه', () => {
  assert.deepEqual(ids('Ebrahim'), ['s-ebi', 's-feat'])
  assert.deepEqual(ids('حامدی'), ['s-ebi', 's-feat'])
})

test('عنوان انگلیسی و عنوان فارسی (alt_title) هر دو پیدا می‌شن', () => {
  assert.deepEqual(ids('khalij'), ['s-ebi'])
  assert.deepEqual(ids('خلیج'), ['s-ebi'])
  assert.deepEqual(ids('Royaye'), ['s-feat'])
})

test('بزرگی و کوچیکی حروف، فاصله و خط‌تیره فرقی نمی‌کنه', () => {
  assert.deepEqual(ids('SHADMEHR'), ['s-feat'])
  assert.deepEqual(ids('mosafer e shab'), ['s-kaveh'])
  assert.deepEqual(ids('mosafereshab'), ['s-kaveh'])
})

test('ي و ك عربی، نیم‌فاصله و اعراب مثل فارسی حساب می‌شن', () => {
  assert.deepEqual(ids('كاوه'), ['s-kaveh']) // ك عربی
  assert.deepEqual(ids('يغمايی'), ['s-kaveh']) // ي عربی
  assert.deepEqual(ids('میخواهمت'), ['s-kaveh']) // بدون نیم‌فاصله
  assert.deepEqual(ids('می خواهمت'), ['s-kaveh']) // با فاصله به‌جای نیم‌فاصله
  assert.deepEqual(ids('شادمِهر'), ['s-feat']) // با کسره
})

test('خواننده‌ای که اسم فارسی نداره جستجو رو خراب نمی‌کنه', () => {
  assert.deepEqual(ids('zedbazi'), ['s-zed'])
  assert.deepEqual(ids('tabestoon'), ['s-zed'])
})

test('چیزی که وجود نداره خالی برمی‌گرده', () => {
  assert.deepEqual(ids('گوگوش'), [])
})

test('نتیجه‌ی جستجو فقط چیزهای لازم رو داره و اسم فایل اصلی رو لو نمی‌ده', () => {
  const results = searchSongs('ابی')
  assert.deepEqual(Object.keys(results[0]).sort(), ['altTitle', 'credit', 'id', 'title'])
  assert.equal(JSON.stringify(results).includes('secret-file'), false)
})
