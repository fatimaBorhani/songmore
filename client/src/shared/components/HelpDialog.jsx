// پنجره‌ی راهنمای بازی (برای همه‌ی بازی‌ها یه شکل، از روی راهنمای جورچین)
// slides: [{ title, body }] — هر اسلاید یه توضیح کوتاه
// دکمه‌ها: «بلدم، رد کن» (بالا)، قبلی/بعدی و آخرش «بزن بریم!». Esc، کلیک بیرون، کلیدهای جهت و کشیدن انگشت هم کار می‌کنن
import { useEffect, useRef, useState } from 'react'

function HelpDialog({ slides, onClose, title = 'چطوری بازی کنم؟' }) {
  const [page, setPage] = useState(0)
  const touchStart = useRef(null)
  const last = slides.length - 1
  const slide = slides[page]

  const next = () => setPage((p) => Math.min(p + 1, last))
  const prev = () => setPage((p) => Math.max(p - 1, 0))

  // فارسی راست‌به‌چپه: فلش چپ یعنی «بعدی»، فلش راست یعنی «قبلی»
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setPage((p) => Math.min(p + 1, last))
      else if (e.key === 'ArrowRight') setPage((p) => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

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
          <h2 id="help-title">{title}</h2>
          <button type="button" className="help-skip" onClick={onClose}>
            بلدم، رد کن
          </button>
        </div>

        <div className="help-slide" key={page} aria-live="polite">
          <h3 className="help-slide-title">{slide.title}</h3>
          {slide.body}
        </div>

        {slides.length > 1 && (
          <div className="help-dots" role="group" aria-label="اسلایدها">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={`help-dot${i === page ? ' active' : ''}`}
                aria-label={`اسلاید ${i + 1} از ${slides.length}: ${s.title}`}
                aria-current={i === page ? 'step' : undefined}
                onClick={() => setPage(i)}
              />
            ))}
          </div>
        )}

        <div className="help-nav">
          {slides.length > 1 && (
            <button type="button" className="help-prev" onClick={prev} disabled={page === 0}>
              قبلی
            </button>
          )}
          {page < last ? (
            <button type="button" className="help-ok" onClick={next} autoFocus>
              بعدی
            </button>
          ) : (
            <button type="button" className="help-ok" onClick={onClose} autoFocus>
              بزن بریم!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default HelpDialog
