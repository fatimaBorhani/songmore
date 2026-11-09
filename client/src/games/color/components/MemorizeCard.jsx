// دور حفظ کردن: رنگ کل صحنه رو پر می‌کنه با حلقه‌ی شمارش معکوس؛ اسلایدرها کم‌رنگ و قفل‌ان
import { faNumber } from '../../../shared/format.js'
import { hsbToCss, readableOn } from '../color.js'
import Scene from './Scene.jsx'
import Sliders from './Sliders.jsx'

const RING = 2 * Math.PI * 72 // دور دایره‌ی حلقه (شعاع ۷۲ توی viewBox ۱۶۰)

function MemorizeCard({ color, hsb, secondsLeft, totalSeconds }) {
  const ink = readableOn(color) // رنگ عدد و حلقه، روی رنگ‌های روشن مشکی و روی تاریک‌ها سفید
  const remaining = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  return (
    <Scene
      stage={
        <section className="color-stage" aria-label="رنگ برای حفظ کردن" style={{ background: hsbToCss(color), color: ink }}>
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
          <span className="color-stage-pill">رنگ اصلی</span>
        </section>
      }
      action={
        <button type="button" className="color-btn" disabled>
          ثبت رنگ
        </button>
      }
    >
      <div className="color-dim" aria-hidden="true">
        <Sliders hsb={hsb} onChange={() => {}} disabled />
      </div>
      <div className="color-overlay">
        <p className="color-overlay-title">رنگ رو حفظ کن</p>
        <p className="color-overlay-text">وقتی رنگ ناپدید شد، اسلایدرها فعال می‌شن</p>
      </div>
    </Scene>
  )
}

export default MemorizeCard
