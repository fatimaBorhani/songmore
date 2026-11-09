// دور حفظ کردن: کارت رنگ با شماره‌ی دور، ثانیه‌شمار درشت (با یه رقم اعشار) و نوار زمان پایین کارت
import { faNumber } from '../../../shared/format.js'
import { hsbToCss, readableOn } from '../color.js'
import Scene from './Scene.jsx'

function MemorizeCard({ color, secondsLeft, totalSeconds, round, roundCount }) {
  const remaining = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  return (
    <Scene label="رنگ برای حفظ کردن" background={hsbToCss(color)} ink={readableOn(color)}>
      <span className="color-round">
        {faNumber(round)} / {faNumber(roundCount)}
      </span>
      <span className="color-big" role="timer" aria-label={`${faNumber(Math.ceil(secondsLeft))} ثانیه`}>
        {faNumber(Math.floor(secondsLeft * 10) / 10, 1)}
      </span>
      <span className="color-corner-label">رنگ اصلی رو حفظ کن</span>
      <div className="color-timebar" aria-hidden="true">
        <div style={{ width: `${remaining * 100}%` }} />
      </div>
    </Scene>
  )
}

export default MemorizeCard
