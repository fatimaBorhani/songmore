import { HOT_MAX, WARM_MAX } from '../clue.js'
import { faNumber } from '../../../shared/format.js'

// آموزش کوتاه بازی (با دکمه‌ی «؟»؛ بار اول خودش باز می‌شه)
function ClueHelp({ onClose }) {
  return (
    <section className="clue-help" aria-label="آموزش بازی">
      <p>
        هر روز یه <b>کلمه‌ی پنهان</b> داریم. هر کلمه‌ای حدس بزنی یه <b>رتبه</b> می‌گیره: هر چی معنیش به جواب نزدیک‌تر
        باشه، عددش کوچیک‌تره. جواب رتبه‌ی ۱ است. حدس محدود نیست؛ با کمترین حدس پیداش کن.
      </p>
      <ul>
        <li className="heat-hot">داغ: رتبه‌ی {faNumber(HOT_MAX)} یا کمتر</li>
        <li className="heat-warm">ولرم: تا {faNumber(WARM_MAX)}</li>
        <li className="heat-cold">سرد: دورتر</li>
      </ul>
      <p>گیر کردی؟ از منوی «⋯» راهنما بگیر یا تسلیم شو.</p>
      <button type="button" className="ghost-button" onClick={onClose}>
        فهمیدم
      </button>
    </section>
  )
}

export default ClueHelp
