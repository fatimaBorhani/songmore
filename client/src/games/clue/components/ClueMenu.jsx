import { useEffect, useRef, useState } from 'react'

// دکمه‌ی «⋯» کنار جای نوشتن: راهنما و تسلیم (تسلیم یه بار تأیید می‌خواد)
function ClueMenu({ busy, onHint, onGiveUp }) {
  const [open, setOpen] = useState(false)
  const [confirmGiveUp, setConfirmGiveUp] = useState(false)
  const box = useRef(null)

  // با کلیک بیرون منو یا Esc بسته می‌شه
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (box.current && !box.current.contains(e.target)) close()
    }
    function onKey(e) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    setConfirmGiveUp(false)
  }

  return (
    <div className="clue-menu" ref={box}>
      <button type="button" className="clue-icon-button" aria-label="بیشتر: راهنما و تسلیم" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="clue-menu-list">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              close()
              onHint()
            }}
          >
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 21h4" />
              <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
            </svg>
            راهنما
            <small>یه کلمه‌ی نزدیک‌تر</small>
          </button>
          {confirmGiveUp ? (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => {
                close()
                onGiveUp()
              }}
            >
              مطمئنی؟ جواب رو نشون بده
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmGiveUp(true)}>
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
              </svg>
              تسلیم
              <small>جواب رو ببینم</small>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ClueMenu
