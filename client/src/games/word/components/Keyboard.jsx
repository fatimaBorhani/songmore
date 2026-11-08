// کیبورد فارسی با رنگ حرف‌ها
//   mode="touch": دکمه‌های بزرگ برای گوشی و تبلت (با لمس تایپ می‌شه)
//   mode="map":   کیبورد کوچیک برای کامپیوتر؛ تایپ اصلی با کیبورد خود کامپیوتره ولی کلیک هم کار می‌کنه
// چیدمان از چپ به راسته، مثل کیبورد واقعی: «پاک کردن» سمت چپ، «ثبت» سمت راست
import { KEY_ROWS } from '../letters.js'

function BackspaceIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5h11v14H9l-6-7z" />
      <path d="M12.5 9.5l5 5M17.5 9.5l-5 5" />
    </svg>
  )
}

function Keyboard({ mode, statuses, onLetter, onEnter, onDelete }) {
  if (mode === 'map') {
    // کامپیوتر: تایپ اصلی با کیبورد فیزیکیه، ولی با کلیک هم کار می‌کنه (tabIndex=-1 تا Tab بین ۳۴ کلید نچرخه)
    return (
      <div className="word-keyboard map" dir="ltr" role="group" aria-label="کیبورد روی صفحه">
        {KEY_ROWS.map((row, r) => (
          <div key={r} className="kb-row">
            {r === 2 && (
              <button type="button" tabIndex={-1} className="kb-key wide" aria-label="پاک کردن" onClick={onDelete}>
                Backspace
              </button>
            )}
            {row.map((letter) => (
              <button
                key={letter}
                type="button"
                tabIndex={-1}
                className={`kb-key ${statuses[letter] || ''}`}
                onClick={() => onLetter(letter)}
              >
                {letter}
              </button>
            ))}
            {r === 2 && (
              <button type="button" tabIndex={-1} className="kb-key wide" aria-label="ثبت" onClick={onEnter}>
                Enter
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="word-keyboard touch" dir="ltr" role="group" aria-label="کیبورد">
      {KEY_ROWS.map((row, r) => (
        <div key={r} className="kb-row">
          {r === 2 && (
            <button type="button" className="kb-key wide" aria-label="پاک کردن" onClick={onDelete}>
              <BackspaceIcon />
            </button>
          )}
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className={`kb-key ${statuses[letter] || ''}`}
              onClick={() => onLetter(letter)}
            >
              {letter}
            </button>
          ))}
          {r === 2 && (
            <button type="button" className="kb-key wide" onClick={onEnter}>
              ثبت
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default Keyboard
