// نتیجه‌ی یه دور: همون قاب تمام‌صفحه دو نیمه می‌شه (راست رنگ اصلی، چپ رنگ تو)؛ امتیاز آروم و ریز ریز بالا می‌ره
import { faNumber } from '../../../shared/format.js'
import { diffChips, faScore, hsbToCss } from '../color.js'
import { useCountUp } from '../useCountUp.js'
import Scene from './Scene.jsx'

function ResultView({ result, game, last, busy, onNext }) {
  const score = useCountUp(result.score)
  // جمع هم از جمع قبل از این دور تا جمع جدید می‌شمره
  const total = useCountUp(game.total, { from: game.total - result.score })
  return (
    <Scene
      label="مقایسه‌ی رنگ‌ها"
      panel={
        <>
          <div className="color-score-row">
            <span>امتیاز این دور</span>
            {/* خود عدد در حال شمارشه؛ برای صفحه‌خوان امتیاز نهایی جدا نوشته شده */}
            <span className="color-score-value" aria-hidden="true">
              {faScore(score)} <small>از {faNumber(10)}</small>
            </span>
            <span className="sr-only" role="status">
              {faScore(result.score)} از {faNumber(10)}
            </span>
          </div>
          <div className="color-bar" role="img" aria-label={`${faNumber(Math.round(result.score * 10))} درصد`}>
            <div style={{ width: `${score * 10}%` }} />
          </div>
          <ul className="color-chips">
            {diffChips(result.diff).map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <div className="color-total-row">
            <span>جمع تا حالا</span>
            <b>
              {faScore(total)} <small>از {faNumber(game.completed * 10)}</small>
            </b>
          </div>
          <button type="button" className="color-btn" disabled={busy} onClick={onNext} autoFocus>
            {last ? 'دیدن نتیجه‌ی نهایی' : 'دور بعد'}
          </button>
        </>
      }
    >
      {/* صفحه راست‌به‌چپه: اولین نیمه (رنگ اصلی) سمت راست می‌افته */}
      <div className="color-halves">
        <div style={{ background: hsbToCss(result.target) }}>
          <span className="color-pill color-pill-top">رنگ اصلی</span>
        </div>
        <div style={{ background: hsbToCss(result.guess) }}>
          <span className="color-pill color-pill-top">رنگ تو</span>
        </div>
      </div>
    </Scene>
  )
}

export default ResultView
