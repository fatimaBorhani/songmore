// تست متن حدس (label) که کلاینت می‌فرسته: فقط متن کوتاه ذخیره می‌شه، بقیه با شناسه‌ی آهنگ عوض می‌شن
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { cleanLabel, MAX_LABEL_LENGTH } = await import('../../games/song/guessLogic.js')
const { app } = await import('../../index.js')

let server
let baseUrl

before(() => {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('a', 'A', 'آ', '[]')").run()
  for (const id of ['song-1', 'song-2', 'song-3', 'song-4']) {
    db.prepare('INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES (?, ?, NULL, ?, ?)').run(id, `T ${id}`, 'A', `${id}.mp3`)
    db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES (?, 'a', 'main')").run(id)
  }
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
})

test('cleanLabel متن معمولی رو نگه می‌داره و فاصله‌ی دو طرفش رو برمی‌داره', () => {
  assert.equal(cleanLabel('خلیج - ابی', 'id'), 'خلیج - ابی')
  assert.equal(cleanLabel('  Khalij  ', 'id'), 'Khalij')
  assert.equal(cleanLabel('x'.repeat(MAX_LABEL_LENGTH), 'id').length, MAX_LABEL_LENGTH)
})

test('cleanLabel برای هر چیز غیرمتن، خالی یا خیلی بلند شناسه‌ی آهنگ رو برمی‌گردونه', () => {
  for (const bad of [undefined, null, '', '   ', 42, true, { a: 1 }, ['x'], 'x'.repeat(MAX_LABEL_LENGTH + 1)]) {
    assert.equal(cleanLabel(bad, 'song-id'), 'song-id')
  }
})

// یه مرورگر تازه (کوکی خودش) که یه حدس با این label می‌فرسته؛ جواب سرور رو برمی‌گردونه
async function guessWithLabel(path, label) {
  const first = await fetch(`${baseUrl}${path}/game`)
  const cookie = first.headers.get('set-cookie').split(';')[0]
  await first.json()
  const game = await (await fetch(`${baseUrl}${path}/game`, { headers: { Cookie: cookie } })).json()
  assert.equal(game.finished, false)
  const res = await fetch(`${baseUrl}${path}/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ songId: 'song-1', label }),
  })
  return { status: res.status, body: await res.json() }
}

for (const [name, path] of [['مسابقه‌ای', '/api/song'], ['تمرینی', '/api/song/practice']]) {
  test(`بازی ${name}: label آبجکت یا عدد سرور رو خراب نمی‌کنه و شناسه‌ی آهنگ ذخیره می‌شه`, async () => {
    for (const bad of [{ evil: true }, 12345, ['a', 'b'], null]) {
      const { status, body } = await guessWithLabel(path, bad)
      assert.equal(status, 200)
      assert.equal(body.guesses.at(-1).guess_text, 'song-1')
    }
  })

  test(`بازی ${name}: label خیلی بلند ذخیره نمی‌شه`, async () => {
    const { status, body } = await guessWithLabel(path, 'ب'.repeat(5000))
    assert.equal(status, 200)
    assert.equal(body.guesses.at(-1).guess_text, 'song-1')
  })

  test(`بازی ${name}: label معمولی همون‌طور ذخیره می‌شه`, async () => {
    const { body } = await guessWithLabel(path, 'خلیج - ابی')
    assert.equal(body.guesses.at(-1).guess_text, 'خلیج - ابی')
  })
}
