// چک فایل‌های واقعی «جوربندی» (server/games/clue/words/)؛ اگه vectors.bin هنوز ساخته نشده، تست رد می‌شه (skip)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const WORDS = new URL('../../games/clue/words/', import.meta.url)
const ready = fs.existsSync(new URL('vectors.bin', WORDS))

test('valid.txt، answers.txt و vectors.bin با هم جورن', { skip: !ready && 'vectors.bin هنوز ساخته نشده (python tools/build_clue_ranks.py)' }, async () => {
  delete process.env.CLUE_WORDS_DIR
  const { answerWords, ranksFor, isValidWord } = await import('../../games/clue/words.js')
  const answers = answerWords()
  assert.ok(answers.length > 0)
  const lines = fs.readFileSync(new URL('answers.txt', WORDS), 'utf8').split(/\r?\n/).filter(Boolean)
  assert.equal(answers.length, lines.length, 'هر جواب باید توی valid.txt باشه')
  const { list, byWord } = ranksFor(answers[0])
  assert.equal(byWord.get(answers[0]), 1)
  assert.equal(list.length, byWord.size, 'کلمه‌ی تکراری توی valid.txt')
  assert.ok(isValidWord(answers[0]))
})
