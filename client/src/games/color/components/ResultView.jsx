// نتیجه‌ی یه دور: دایره‌ی دونیمه (راست رنگ اصلی، چپ رنگ تو)، امتیاز، نوار و اختلاف هر مولفه
import { faNumber } from '../../../shared/format.js'
import { diffChips, faScore, hsbToCss } from '../color.js'

function ResultView({ result, game, last, busy, onNext }) {
  return (
    <div className="color-split color-result">
      <section className="color-compare" aria-label="مقایسه‌ی رنگ‌ها">
        <div className="color-circle" role="img" aria-label="نیمه‌ی راست رنگ اصلی، نیمه‌ی چپ رنگ تو">
          <div style={{ background: hsbToCss(result.target) }} />
          <div style={{ background: hsbToCss(result.guess) }} />
        </div>
        <div className="color-labels">
          <span>رنگ اصلی</span>
          <span>رنگ تو</span>
        </div>
      </section>

      <div className="color-score-col">
        <section className="color-score-card" aria-label="امتیاز این دور" aria-live="polite">
          <div className="color-score-row">
            <span>امتیاز این دور</span>
            <span className="color-score-value">
              {faScore(result.score)} <small>از {faNumber(10)}</small>
            </span>
          </div>
          <div className="color-bar" role="img" aria-label={`${faNumber(Math.round(result.score * 10))} درصد`}>
            <div style={{ width: `${result.score * 10}%` }} />
          </div>
          <ul className="color-chips">
            {diffChips(result.diff).map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <div className="color-total-row">
            <span>جمع تا حالا</span>
            <b>
              {faScore(game.total)} <small>از {faNumber(game.completed * 10)}</small>
            </b>
          </div>
        </section>
        <button type="button" className="color-btn" disabled={busy} onClick={onNext} autoFocus>
          {last ? 'دیدن نتیجه‌ی نهایی' : 'دور بعد'}
        </button>
      </div>
    </div>
  )
}

export default ResultView
