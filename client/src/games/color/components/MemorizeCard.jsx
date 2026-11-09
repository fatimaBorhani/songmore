// دور حفظ کردن: رنگ کل صفحه رو پر می‌کنه؛ عدد ثانیه‌ها گوشه و یه نوار باریک کنار صفحه که خالی می‌شه
import { faNumber } from '../../../shared/format.js'
import { hsbToCss, readableOn } from '../color.js'
import Scene from './Scene.jsx'

function MemorizeCard({ color, secondsLeft, totalSeconds, round, roundCount }) {
  const remaining = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  return (
    <Scene label="رنگ برای حفظ کردن" background={hsbToCss(color)} ink={readableOn(color)}>
      <div className="color-timebar" aria-hidden="true">
        <div style={{ height: `${remaining * 100}%` }} />
      </div>
      <span className="color-corner-number" role="timer" aria-label={`${faNumber(Math.ceil(secondsLeft))} ثانیه`}>
        {faNumber(Math.ceil(secondsLeft))}
      </span>
      <span className="color-pill color-pill-bottom">
        رنگ اصلی · دور {faNumber(round)} از {faNumber(roundCount)}
      </span>
    </Scene>
  )
}

export default MemorizeCard
