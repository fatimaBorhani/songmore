// قبل از هر دور: تا کاربر آماده نباشه رنگ نشون داده نمی‌شه (توضیح بازی فقط توی راهنمای چراغه)
import { faNumber } from '../../../shared/format.js'

function ReadyCard({ round, roundCount, busy, onStart }) {
  return (
    <section className="color-card color-ready" aria-label="شروع دور">
      <p className="color-ready-round">
        دور {faNumber(round)} از {faNumber(roundCount)}
      </p>
      <button type="button" className="color-btn" disabled={busy} onClick={onStart} autoFocus>
        {busy ? 'کمی صبر کن...' : 'آماده‌ام، شروع'}
      </button>
    </section>
  )
}

export default ReadyCard
