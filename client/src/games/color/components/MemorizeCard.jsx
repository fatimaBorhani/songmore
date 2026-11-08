// دور حفظ کردن: رنگ توی یه کارت بزرگ و یه حلقه‌ی شمارش معکوس با عدد درشت
import { faNumber } from '../../../shared/format.js'
import { hsbToCss, readableOn } from '../color.js'

const RING = 2 * Math.PI * 72 // دور دایره‌ی حلقه (شعاع ۷۲ توی viewBox ۱۶۰)

function MemorizeCard({ color, secondsLeft, totalSeconds }) {
  const ink = readableOn(color) // رنگ عدد و حلقه، روی رنگ‌های روشن مشکی و روی تاریک‌ها سفید
  const remaining = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  return (
    <section className="color-card color-memorize" aria-label="رنگ برای حفظ کردن" style={{ background: hsbToCss(color), color: ink }}>
      <div className="color-ring">
        <svg aria-hidden="true" viewBox="0 0 160 160" fill="none">
          <circle cx="80" cy="80" r="72" stroke="currentColor" strokeOpacity="0.2" strokeWidth="7" />
          <circle
            className="color-ring-arc"
            cx="80"
            cy="80"
            r="72"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - remaining)}
          />
        </svg>
        <span className="color-ring-number">{faNumber(Math.ceil(secondsLeft))}</span>
      </div>
    </section>
  )
}

export default MemorizeCard
