// قبل از هر دور: تا کاربر آماده نباشه رنگ نشون داده نمی‌شه
import { faNumber } from '../../../shared/format.js'

function ReadyCard({ round, roundCount, seconds, busy, onStart, showIntro }) {
  return (
    <section className="color-card color-ready" aria-label="شروع دور">
      <p className="color-ready-round">
        دور {faNumber(round)} از {faNumber(roundCount)}
      </p>
      {/* توضیح بازی فقط بار اول */}
      {showIntro && (
        <p className="color-ready-text">یه رنگ رو {faNumber(seconds)} ثانیه می‌بینی؛ بعد ناپدید می‌شه و باید از حافظه بسازیش.</p>
      )}
      <button type="button" className="color-btn" disabled={busy} onClick={onStart} autoFocus>
        {busy ? 'کمی صبر کن...' : 'آماده‌ام، شروع'}
      </button>
    </section>
  )
}

export default ReadyCard
