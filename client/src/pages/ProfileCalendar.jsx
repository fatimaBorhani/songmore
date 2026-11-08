// کارت تقویم فعالیت: ۱۰ هفته، هر مربع یه روز؛ هر چه روشن‌تر باشه امتیاز اون روز بیشتر بوده
import { faNumber } from '../shared/format.js'
import { buildCalendar, faDay, gamesOf } from './calendar.js'

// «۱۷ آبان · ۳ بازی (مسابقه‌ای، ۲ تمرینی)»
function cellTitle(cell) {
  if (!cell.day) return undefined
  const parts = []
  if (cell.day.daily) parts.push('مسابقه‌ای')
  if (cell.day.practice) parts.push(`${faNumber(cell.day.practice)} تمرینی`)
  return `${faDay(cell.date)} · ${faNumber(gamesOf(cell.day))} بازی (${parts.join('، ')})`
}

function ProfileCalendar({ today, activity }) {
  const { cells, activeDays } = buildCalendar(today, activity)
  return (
    <section className="profile-card profile-calendar" aria-label="تقویم فعالیت">
      <div className="profile-calendar-head">
        <h2>۱۰ هفته‌ی اخیر</h2>
        <span>{activeDays ? `${faNumber(activeDays)} روز فعال` : 'هنوز بازی‌ای نکردی'}</span>
      </div>
      <div
        className="heatmap"
        role="img"
        aria-label={`تقویم ده هفته‌ی اخیر؛ ${faNumber(activeDays)} روز فعال. هر مربع یک روز است و هر چه روشن‌تر باشد آن روز بیشتر بازی شده`}
      >
        {cells.map((cell) => (
          <i key={cell.date} className={`lv${cell.level}${cell.future ? ' future' : ''}`} title={cellTitle(cell)} />
        ))}
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        <span>بازی کمتر</span>
        <i className="lv1" />
        <i className="lv2" />
        <i className="lv3" />
        <i className="lv4" />
        <span>بیشتر</span>
      </div>
    </section>
  )
}

export default ProfileCalendar
