// نرمال‌سازی متن فارسی برای جستجو و تطبیق حدس
// ي -> ی ، ك -> ک ، حذف نیم‌فاصله و اعراب، لاتین کوچیک، حذف فاصله‌ها
export function normalizePersian(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌ً-ٟ]/g, '') // نیم‌فاصله و اعراب عربی/فارسی
    .replace(/[^\p{L}\p{N}]/gu, '') // فقط حروف و عدد بمونه (فاصله و علامت حذف)
}
