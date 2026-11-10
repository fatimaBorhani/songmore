// پیشرفت بازی مسابقه‌ای امروز: «آهنگ ۲ از ۳» و یه نقطه برای هر آهنگ
// (تموم‌شده آبی، آهنگ جاری سفید، باقی‌مونده خاکستری)
import { faNumber } from '../../../shared/format.js'

function DayProgress({ game }) {
  return (
    <div className="day-progress" role="img" aria-label={`آهنگ ${faNumber(game.slot)} از ${faNumber(game.songCount)}`}>
      <span className="day-progress-text">
        آهنگ {faNumber(game.slot)} از {faNumber(game.songCount)}
      </span>
      <div className="day-progress-dots" aria-hidden="true">
        {game.slots.map((s) => (
          <span key={s.slot} className={s.finished ? 'done' : s.slot === game.slot ? 'current' : ''} />
        ))}
      </div>
    </div>
  )
}

export default DayProgress
