// حالت روز/شب سایت: «day» (روز کاغذی) یا «night» (نیمه‌شب ملایم)
// اگه بازیکن خودش انتخاب نکرده باشه، از تنظیم روشن/تیره‌ی سیستمش پیروی می‌کنه.
// انتخاب بازیکن فقط توی همین مرورگر می‌مونه (localStorage). رنگ‌های هر حالت توی index.css هستن.

export const THEME_KEY = 'songmore_theme'

// انتخاب ذخیره‌شده‌ی بازیکن، یا null اگه چیزی انتخاب نکرده
export function savedTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'day' || value === 'night' ? value : null
  } catch {
    return null
  }
}

// حالت سیستم (تنظیم روشن/تیره‌ی گوشی یا کامپیوتر)
export function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'day' : 'night'
}

export function currentTheme() {
  return savedTheme() ?? systemTheme()
}

// رنگ‌ها رو عوض کن (روی <html data-theme>)
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

// انتخاب بازیکن رو ذخیره و اعمال کن
export function chooseTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // حالت خصوصی مرورگر: فقط برای همین بار اعمال می‌شه
  }
  applyTheme(theme)
}
