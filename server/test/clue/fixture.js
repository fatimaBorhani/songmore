// داده‌ی کوچیک و ثابت برای تست‌های «کلمه‌ی پنهان» (به‌جای فایل‌های واقعی words/):
// هر کلمه یه بردار دوبعدی با زاویه‌ی مشخص، پس رتبه‌ها از قبل معلومن.
//   دور «کتاب» (زاویه‌ی ۰): کتاب ۱، کتابی ۲، کتب ۳، کتاب‌ها ۴، رمان ۵، جلد ۶، ...
//   دور «دریا» (زاویه‌ی ۱۸۰): دریا، اقیانوس، ساحل، ...
// باید قبل از import کردن سرور صدا زده بشه (پوشه از CLUE_WORDS_DIR خونده می‌شه).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const BOOK_WORDS = ['کتاب', 'کتابی', 'کتب', 'کتاب‌ها', 'رمان', 'جلد', 'کتابفروشی', 'جزوه', 'کتابچه', 'مجموعه', 'دانلود', 'داستان']
export const SEA_WORDS = ['دریا', 'اقیانوس', 'ساحل', 'موج', 'خلیج', 'دریاچه', 'بندر', 'قایق', 'ناخدا', 'کشتی', 'ماهی', 'آب']
export const OTHER_WORDS = [['سیب', 100], ['ماشین', 130], ['کوه', 90]]
export const FIXTURE_ANSWERS = ['کتاب', 'دریا', 'کوه']

export function useClueFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clue-words-'))
  const entries = [
    ...BOOK_WORDS.map((w, i) => [w, i * 4]),
    ...SEA_WORDS.map((w, i) => [w, 180 + i * 4]),
    ...OTHER_WORDS,
  ]
  const dim = 2
  const buf = Buffer.alloc(8 + entries.length * 4 + entries.length * dim)
  buf.writeUInt32LE(entries.length, 0)
  buf.writeUInt32LE(dim, 4)
  entries.forEach(([, deg], i) => {
    const v = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)]
    const scale = Math.max(...v.map(Math.abs)) / 127
    buf.writeFloatLE(scale, 8 + i * 4)
    v.forEach((x, d) => buf.writeInt8(Math.round(x / scale), 8 + entries.length * 4 + i * dim + d))
  })
  fs.writeFileSync(path.join(dir, 'vectors.bin'), buf)
  fs.writeFileSync(path.join(dir, 'valid.txt'), entries.map(([w]) => w).join('\n') + '\n')
  fs.writeFileSync(path.join(dir, 'answers.txt'), FIXTURE_ANSWERS.join('\n') + '\n')
  process.env.CLUE_WORDS_DIR = dir
  return dir
}
