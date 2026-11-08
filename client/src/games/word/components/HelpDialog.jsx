// آموزش بازی توی سه اسلاید (با دکمه‌ی قبلی/بعدی، نقطه‌ها، کلیدهای جهت و کشیدن انگشت)
import { useEffect, useRef, useState } from 'react'

function Example({ word, index, result, text }) {
  return (
    <div className="help-example">
      <div className="help-tiles" aria-hidden="true">
        {Array.from(word).map((letter, i) => (
          <span key={i} className={`tile small ${i === index ? result : 'plain'}`}>
            {letter}
          </span>
        ))}
      </div>
      <p>{text}</p>
    </div>
  )
}

// هر اسلاید یه توضیح کوتاه + یه مثال
const SLIDES = [
  {
    title: 'هدف بازی',
    body: (
      <>
        <p>کلمه‌ی ۵ حرفی امروز رو با ۶ حدس پیدا کن. بعد از هر حدس، رنگ خونه‌ها نشون می‌ده چقدر نزدیک شدی.</p>
        <Example word="پرواز" index={0} result="correct" text="«پ» توی کلمه هست و جاش هم درسته." />
      </>
    ),
  },
  {
    title: 'جای درست و غلط',
    body: (
      <>
        <Example word="سفارش" index={3} result="present" text="«ر» توی کلمه هست ولی جای دیگه." />
        <Example word="کاشتن" index={2} result="absent" text="«ش» اصلاً توی کلمه نیست." />
      </>
    ),
  },
  {
    title: 'چند نکته',
    body: (
      <ul className="help-list">
        <li>«آ» و «ا» دو حرف جدا حساب می‌شن.</li>
        <li>هر ترکیب ۵ حرفی قبوله، حتی اگه کلمه‌ی معنی‌داری نباشه.</li>
        <li>هر روز نیمه‌شب کلمه‌ی جدید میاد.</li>
      </ul>
    ),
  },
]

function HelpDialog({ onClose }) {
  const [page, setPage] = useState(0)
  const touchStart = useRef(null)
  const last = SLIDES.length - 1
  const slide = SLIDES[page]

  const next = () => setPage((p) => Math.min(p + 1, last))
  const prev = () => setPage((p) => Math.max(p - 1, 0))

  // فارسی راست‌به‌چپه: فلش چپ یعنی «بعدی»، فلش راست یعنی «قبلی»
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') setPage((p) => Math.min(p + 1, SLIDES.length - 1))
      else if (e.key === 'ArrowRight') setPage((p) => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // کشیدن انگشت: به چپ = بعدی، به راست = قبلی
  function onTouchEnd(e) {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) next()
    else prev()
  }

  return (
    <div className="help-backdrop" onClick={onClose}>
      <div
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        <div className="help-head">
          <h2 id="help-title">چطوری بازی کنم؟</h2>
          <button type="button" className="icon-button" aria-label="بستن" onClick={onClose}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="help-slide" key={page} aria-live="polite">
          <h3 className="help-slide-title">{slide.title}</h3>
          {slide.body}
        </div>

        <div className="help-dots" role="group" aria-label="اسلایدها">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className={`help-dot${i === page ? ' active' : ''}`}
              aria-label={`اسلاید ${i + 1} از ${SLIDES.length}: ${s.title}`}
              aria-current={i === page ? 'step' : undefined}
              onClick={() => setPage(i)}
            />
          ))}
        </div>

        <div className="help-nav">
          <button type="button" className="ghost-button" onClick={prev} disabled={page === 0}>
            قبلی
          </button>
          {page < last ? (
            <button type="button" className="primary-button help-next" onClick={next} autoFocus>
              بعدی
            </button>
          ) : (
            <button type="button" className="primary-button help-next" onClick={onClose} autoFocus>
              فهمیدم
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default HelpDialog
