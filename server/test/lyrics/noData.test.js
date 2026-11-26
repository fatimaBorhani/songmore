// بدون فایل داده‌ی «شعر یادت نره» همه‌ی درخواست‌ها NO_DATA (503) می‌گیرن
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
process.env.LYRICS_GAME_PATH = '/nonexistent/lyrics_game.json'
const { app } = await import('../../index.js')

let server
before(() => {
  server = http.createServer(app)
  server.listen(0)
})
after(() => server.close())

test('بدون داده: NO_DATA', async () => {
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/lyrics/game`)
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: 'NO_DATA' })
})
