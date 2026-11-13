// هدف جمعی: «۱۲ از ۳۰ سؤال به ۱۰۰ جواب رسیدن». compact = نوار کوچیک پایین صفحه‌ی سؤال، وگرنه کارت کامل
import { faNumber } from '../../../shared/format.js'

function Bar({ goal }) {
  const percent = Math.min(100, Math.round(goal.progress * 100))
  // کمی پر باشه تا نوار از اول دیده بشه
  const width = goal.progress > 0 ? Math.max(percent, 2) : 0
  return (
    <div className="survey-bar" role="img" aria-label={`${faNumber(percent)} درصد`}>
      <div className="survey-bar-fill" style={{ width: `${width}%` }} />
    </div>
  )
}

function GoalBar({ goal, compact = false }) {
  const reached = goal.completed >= goal.target
  if (compact) {
    return (
      <div className="survey-goal-strip" aria-label="هدف جمعی">
        <span>
          هدف جمعی: {faNumber(Math.min(goal.completed, goal.target))} از {faNumber(goal.target)} سؤال
        </span>
        <Bar goal={goal} />
      </div>
    )
  }
  return (
    <section className="survey-goal" aria-label="هدف جمعی">
      <div className="survey-goal-head">
        <span>هدف جمعی</span>
        <b>
          {faNumber(Math.min(goal.completed, goal.target))} <small>از {faNumber(goal.target)} سؤال</small>
        </b>
      </div>
      <Bar goal={goal} />
      <p>
        {reached
          ? 'هدف کامل شد! ممنون از همه. بازی «صد نفر گفتن» با جواب‌های واقعی شما ساخته می‌شه.'
          : `هر سؤال که به ${faNumber(goal.perQuestion)} جواب برسه، یه قدم نزدیک می‌شیم. وقتی ${faNumber(goal.target)} سؤال کامل شد، بازی «صد نفر گفتن» با جواب‌های واقعی خودتون ساخته می‌شه.`}
      </p>
      <p className="survey-goal-total">تا الان {faNumber(goal.totalAnswers)} جواب جمع شده</p>
    </section>
  )
}

export default GoalBar
