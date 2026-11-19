// تا وقتی داده‌ی «کلمه‌ی پنهان» (vectors.bin) ساخته نشده، API خطای روشن NO_DATA می‌ده و سرور از کار نمی‌افته
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
process.env.CLUE_WORDS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'clue-empty-'))

const { app } = await import('../../index.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

test('بدون vectors.bin همه‌ی مسیرها 503 و NO_DATA', async () => {
  let res = await fetch(`${baseUrl}/api/clue/game`)
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: 'NO_DATA' })
  res = await fetch(`${baseUrl}/api/clue/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"word":"کتاب"}' })
  assert.equal(res.status, 503)
  // بقیه‌ی سایت کار می‌کنه
  assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200)
})
