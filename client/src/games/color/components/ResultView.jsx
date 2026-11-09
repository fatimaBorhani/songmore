// نتیجه‌ی یه دور: همون کارت دو نیمه می‌شه (بالا رنگ تو با امتیاز، پایین رنگ اصلی)؛
// امتیاز آروم و ریز ریز بالا می‌ره. اختلاف هر مولفه و جمع زیر کارت میان
import { faDigits, faNumber } from '../../../shared/format.js'
import { diffChips, faScore, hsbToCss, readableOn } from '../color.js'
import { useCountUp } from '../useCountUp.js'

// یه جمله‌ی کوتاه برای امتیاز
function scoreMessage(score) {
  if (score >= 9.8) return 'اینقدر نزدیکه که ترسناکه!'
  if (score >= 9.5) return 'تقریباً عین خودشه!'
  if (score >= 9) return 'خیلی نزدیک بود!'
  if (score >= 8) return 'خوب بود.'
  if (score >= 6) return 'بد نبود.'
  if (score >= 4) return 'یه کم دور بود.'
  return 'این دفعه نه.'
}

const hsbText = (c) => faDigits(`H${c.h} S${c.s} B${c.b}`)

function ResultView({ result, game, last, busy, onNext }) {
  const score = useCountUp(result.score)
  // جمع هم از جمع قبل از این دور تا جمع جدید می‌شمره
  const total = useCountUp(game.total, { from: game.total - result.score })
  return (
    <>
      <section className="color-stage color-result-stage" aria-label="مقایسه‌ی رنگ‌ها">
        <div className="color-half" style={{ background: hsbToCss(result.guess), color: readableOn(result.guess) }}>
          <span className="color-round">
            {faNumber(game.completed)} / {faNumber(game.roundCount)}
          </span>
          <div className="color-score-head">
            {/* خود عدد در حال شمارشه؛ برای صفحه‌خوان امتیاز نهایی جدا نوشته شده */}
            <span className="color-big" aria-hidden="true">
              {faScore(score)}
            </span>
            <span className="sr-only" role="status">
              امتیاز {faScore(result.score)} از {faNumber(10)}
            </span>
            <span className="color-message">{scoreMessage(result.score)}</span>
          </div>
          <div className="color-half-label">
            <span>رنگ تو</span>
            <b dir="ltr">{hsbText(result.guess)}</b>
          </div>
        </div>
        <div className="color-half" style={{ background: hsbToCss(result.target), color: readableOn(result.target) }}>
          <div className="color-half-label">
            <span>رنگ اصلی</span>
            <b dir="ltr">{hsbText(result.target)}</b>
          </div>
          <button
            type="button"
            className="color-next"
            disabled={busy}
            onClick={onNext}
            autoFocus
            aria-label={last ? 'دیدن نتیجه‌ی نهایی' : 'دور بعد'}
          >
            {/* توی راست‌به‌چپ «بعدی» سمت چپه */}
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
        </div>
      </section>

      <div className="color-under">
        <ul className="color-chips">
          {diffChips(result.diff).map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <span className="color-under-total">
          جمع تا حالا <b>{faScore(total)}</b> از {faNumber(game.completed * 10)}
        </span>
      </div>
    </>
  )
}

export default ResultView
