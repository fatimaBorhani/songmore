// هدف جمعی به شکل یه نوار باریک: «هدف جمعی ۱۲ / ۱۰۰» (توضیحش فقط توی راهنمای چراغه)
// onBlue: روی کارت آبی صفحه‌ی آخر (رنگ‌های روشن‌تر)
import { faNumber } from '../../../shared/format.js'

function GoalBar({ goal, onBlue = false }) {
  const percent = Math.min(100, Math.round(goal.progress * 100))
  const width = goal.progress > 0 ? Math.max(percent, 2) : 0 // کمی پر باشه تا نوار از اول دیده بشه
  return (
    <div className={`survey-goal${onBlue ? ' on-blue' : ''}`} role="img" aria-label={`هدف جمعی: ${faNumber(Math.min(goal.completed, goal.target))} از ${faNumber(goal.target)} سؤال`}>
      <span>هدف جمعی</span>
      <span className="survey-bar">
        <span className="survey-bar-fill" style={{ width: `${width}%` }} />
      </span>
      <b>
        {faNumber(Math.min(goal.completed, goal.target))} / {faNumber(goal.target)}
      </b>
    </div>
  )
}

export default GoalBar
