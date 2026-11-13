// حروف، چیدمان کیبورد و تبدیل کلیدهای کیبورد به حرف فارسی
import { faDigits } from '../../shared/format.js'

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

// کلیدهایی که خودشون حرف نیستن (Enter، Backspace، فلش‌ها، Shift و ...) و نباید «ناشناخته» حساب بشن
function isCharacterKey(e) {
  return e.key.length === 1 || e.key === 'Process' || e.key === 'Unidentified' || e.key === 'Dead'
}

// حرف فارسیِ یه کلید، یا null اگه حرف نبود
export function letterFromKeyEvent(e) {
  const key = VARIANTS[e.key] ?? e.key
  if (LETTERS.has(key)) return key // زبان سیستم فارسیه و کلید خودش حرف فارسی داده
  // هر کلید حرفی دیگه (کیبورد انگلیسی، کیبورد IME که Process می‌ده، حرف عربی یا هر چیز غیرمنتظره):
  // از جای کلید روی کیبورد حرف فارسیِ همون جا رو پیدا می‌کنیم
  if (isCharacterKey(e)) {
    if (e.shiftKey && SHIFT_CODE_TO_LETTER[e.code]) return SHIFT_CODE_TO_LETTER[e.code]
    return CODE_TO_LETTER[e.code] ?? null
  }
  return null
}

// کلیدی که حرف بوده ولی حرف فارسی ازش در نمیاد (مثلاً عدد یا علامت)؛ برای پیام «این کلید رو نمی‌شناسم»
export function isUnknownCharacterKey(e) {
  return isCharacterKey(e) && e.key !== 'Process' && e.key !== 'Unidentified' && e.key !== 'Dead' && e.key !== ' '
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

// متن اشتراک نتیجه‌ی روز: برای هر کلمه (۳، ۴ و ۵ حرفی) یه تیتر با تعداد حدس و مربع‌های رنگی، بدون لو دادن حرف‌ها
const SHARE_SQUARES = { correct: '🟦', present: '⬜', absent: '⬛' }
export function shareText(game, title) {
  const RLM = '\u200f' // تا توی برنامه‌ها ردیف‌ها راست‌به‌چپ نشون داده بشن
  const lines = [faDigits(title)]
  for (const slot of game.slots) {
    const score = slot.won ? slot.guessCount : 'X'
    lines.push(RLM + faDigits(`${slot.length} حرفی ${score}/${slot.maxGuesses}`))
    // فقط ۶ ردیف اول (مثل نتیجه‌ی حساب‌شده)؛ حدس‌های بعد از «ادامه» توی اشتراک نمیاد
    for (const row of slot.rows.slice(0, slot.maxGuesses)) lines.push(RLM + row.map((r) => SHARE_SQUARES[r]).join(''))
  }
  return lines.join('\n')
}
