// نقطه‌های پیشرفت دورها: انجام‌شده (آبی)، دور جاری (سفید)، باقی‌مونده (خاکستری)
import { faNumber } from '../../../shared/format.js'

// completed: چند دور تموم شده، current: شماره‌ی دور جاری (از صفر) یا -1 وقتی دور جاری نداریم (نتیجه یا پایان)
function Dots({ total, completed, current }) {
  const label = current >= 0 ? `دور ${faNumber(current + 1)} از ${faNumber(total)}` : `${faNumber(completed)} دور از ${faNumber(total)} تموم شده`
  return (
    <div className="color-dots" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < completed ? 'done' : i === current ? 'current' : ''} />
      ))}
    </div>
  )
}

export default Dots
