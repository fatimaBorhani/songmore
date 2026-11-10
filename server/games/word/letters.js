// حروف و کلمه‌های بازی واژه‌یاب (طول کلمه و تعداد حدس‌ها توی wordLists.js)
import { validWords } from './wordLists.js'

// ۳۴ حرف بازی: ۳۲ حرف الفبا + «آ» و «ئ» که حرف جدا حساب می‌شن (آ با ا یکی نیست)
export const LETTERS = new Set(Array.from('اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئ'))

// شکل‌های عربی یا دیگه‌ی بعضی حروف -> شکل فارسی‌شون
const VARIANTS = {
  'ي': 'ی',
  'ى': 'ی',
  'ك': 'ک',
  'ة': 'ه',
  'ۀ': 'ه',
  'أ': 'ا',
  'إ': 'ا',
  'ؤ': 'و',
}

// فاصله، نیم‌فاصله، کشیده (ـ) و اعراب حذف می‌شن
const IGNORED = /[\s‌‍ـً-ٰٟ]/

export function normalizeWord(text) {
  return Array.from(String(text ?? ''))
    .map((ch) => VARIANTS[ch] ?? ch)
    .filter((ch) => !IGNORED.test(ch))
    .join('')
}

// اگه حدس برای بازی با کلمه‌ی length حرفی قابل قبول نیست کد خطا برمی‌گردونه، وگرنه null.
// فقط کلمه‌های لیست (لیلک) قبولن؛ بقیه NOT_IN_LIST.
export function validateWord(word, length) {
  const letters = Array.from(word)
  if (letters.some((ch) => !LETTERS.has(ch))) return 'INVALID_LETTERS'
  if (letters.length !== length) return 'WORD_LENGTH'
  if (!validWords(length).has(word)) return 'NOT_IN_LIST'
  return null
}
