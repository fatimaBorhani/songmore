// حروف و کلمه‌های بازی واژه‌یاب
export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

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

// اگه کلمه قابل قبول نیست کد خطا برمی‌گردونه، وگرنه null.
// فعلاً هر ترکیب ۵ حرفی قبوله (حتی کلمه‌ای که وجود نداره)؛ بعداً با لیست کلمه‌ها چک می‌شه.
export function validateWord(word) {
  const letters = Array.from(word)
  if (letters.some((ch) => !LETTERS.has(ch))) return 'INVALID_LETTERS'
  if (letters.length !== WORD_LENGTH) return 'WORD_LENGTH'
  return null
}
