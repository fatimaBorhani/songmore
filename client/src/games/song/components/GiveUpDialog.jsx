// پنجره‌ی تأیید «نمایش جواب» (به‌جای پنجره‌ی خود مرورگر)؛ با Esc یا کلیک بیرون بسته می‌شه
import { useEffect } from 'react'

function GiveUpDialog({ onConfirm, onCancel, busy }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="giveup-backdrop" onClick={onCancel}>
      <div
        className="giveup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="giveup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="giveup-icon" aria-hidden="true">
          <EyeIcon size={26} />
        </span>
        <h2 id="giveup-title">جواب رو ببینی؟</h2>
        <p>با دیدن جواب بازی امروز تموم می‌شه و امتیازی نمی‌گیری.</p>
        <div className="giveup-actions">
          <button type="button" className="giveup-cancel" onClick={onCancel} autoFocus>
            ادامه می‌دم
          </button>
          <button type="button" className="giveup-confirm" disabled={busy} onClick={onConfirm}>
            نشون بده
          </button>
        </div>
      </div>
    </div>
  )
}

export function EyeIcon({ size = 18 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default GiveUpDialog
