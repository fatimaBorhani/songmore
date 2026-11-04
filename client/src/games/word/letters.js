// حروف، چیدمان کیبورد و تبدیل کلیدهای کیبورد به حرف فارسی
import { faDigits } from '../../shared/format.js'

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

// چیدمان کیبورد استاندارد فارسی، از چپ به راست (همون‌جوری که روی کیبورد کامپیوتر دیده می‌شه)
// «آ» و «ئ» حرف جدا هستن (آ با ا یکی نیست)
export const KEY_ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'چ', 'پ'],
  ['ش', 'س', 'ی', 'ب', 'ل', 'آ', 'ا', 'ت', 'ن', 'م', 'ک', 'گ'],
  ['ظ', 'ط', 'ژ', 'ز', 'ر', 'ذ', 'د', 'ئ', 'و'],
]

export const LETTERS = new Set(KEY_ROWS.flat())

// وقتی زبان سیستم انگلیسیه، از جای کلید روی کیبورد (event.code) حرف فارسی همون جا رو پیدا می‌کنیم.
// اینجوری لازم نیست کاربر زبان سیستمش رو عوض کنه.
const CODE_TO_LETTER = {
  KeyQ: 'ض', KeyW: 'ص', KeyE: 'ث', KeyR: 'ق', KeyT: 'ف', KeyY: 'غ', KeyU: 'ع',
  KeyI: 'ه', KeyO: 'خ', KeyP: 'ح', BracketLeft: 'ج', BracketRight: 'چ', Backslash: 'پ',
  KeyA: 'ش', KeyS: 'س', KeyD: 'ی', KeyF: 'ب', KeyG: 'ل', KeyH: 'ا', KeyJ: 'ت',
  KeyK: 'ن', KeyL: 'م', Semicolon: 'ک', Quote: 'گ',
  KeyZ: 'ظ', KeyX: 'ط', KeyC: 'ز', KeyV: 'ر', KeyB: 'ذ', KeyN: 'د', KeyM: 'ئ', Comma: 'و',
}
// با Shift: مثل کیبورد فارسی، Shift+H = آ و Shift+C = ژ
const SHIFT_CODE_TO_LETTER = { KeyH: 'آ', KeyC: 'ژ' }

// شکل‌های عربی بعضی حروف (مثلاً از کیبوردهای قدیمی) -> فارسی
const VARIANTS = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه', 'أ': 'ا', 'إ': 'ا', 'ؤ': 'و' }

// حرف فارسیِ یه کلید، یا null اگه حرف نبود
export function letterFromKeyEvent(e) {
  const key = VARIANTS[e.key] ?? e.key
  if (LETTERS.has(key)) return key // زبان سیستم فارسیه
  // زبان سیستم انگلیسیه (کلید یه حرف یا علامت لاتین داده)
  if (/^[\x21-\x7e]$/.test(e.key)) {
    if (e.shiftKey && SHIFT_CODE_TO_LETTER[e.code]) return SHIFT_CODE_TO_LETTER[e.code]
    return CODE_TO_LETTER[e.code] ?? null
  }
  return null
}

// بهترین رنگی که هر حرف تا الان گرفته (برای رنگ کیبورد): درست > جای غلط > نیست
const RANK = { absent: 1, present: 2, correct: 3 }
export function letterStatuses(guesses) {
  const statuses = {}
  for (const guess of guesses) {
    for (const { letter, result } of guess.letters) {
      if (!statuses[letter] || RANK[result] > RANK[statuses[letter]]) statuses[letter] = result
    }
  }
  return statuses
}

// متن اشتراک نتیجه: مربع‌های رنگی، بدون لو دادن حرف‌ها
const SHARE_SQUARES = { correct: '🟦', present: '⬜', absent: '⬛' }
export function shareText(game, title) {
  const RLM = '‏' // تا توی برنامه‌ها ردیف‌ها راست‌به‌چپ نشون داده بشن
  const score = game.won ? game.guesses.length : 'X'
  const rows = game.guesses.map((g) => RLM + g.letters.map((l) => SHARE_SQUARES[l.result]).join(''))
  return [faDigits(`${title} ${score}/${game.maxGuesses}`), ...rows].join('\n')
}
