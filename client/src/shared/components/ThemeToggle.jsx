import { useEffect, useState } from 'react'
import { applyTheme, chooseTheme, currentTheme, savedTheme } from '../theme.js'

// دکمه‌ی روز/شب توی سربرگ: توی حالت شب آیکن خورشید (یعنی «برو روز»)، توی روز آیکن ماه
function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)

  // تا وقتی بازیکن خودش انتخاب نکرده، با عوض شدن تنظیم سیستم عوض شو
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!media) return
    function onChange() {
      if (savedTheme()) return
      const next = media.matches ? 'day' : 'night'
      applyTheme(next)
      setTheme(next)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next = theme === 'day' ? 'night' : 'day'
    chooseTheme(next)
    setTheme(next)
  }

  const label = theme === 'day' ? 'حالت شب' : 'حالت روز'
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {theme === 'day' ? (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      ) : (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
