// کارت تقویم فعالیت: ۱۰ هفته، هر مربع یه روز؛ هر چه روشن‌تر باشه امتیاز اون روز بیشتر بوده
import { faNumber } from '../shared/format.js'
import { buildCalendar, faDay } from './calendar.js'

function cellTitle(cell) {
  if (!cell.day) return undefined
  const result = cell.day.won ? `${faNumber(cell.day.score)} امتیاز` : 'پیدا نشد'
  return `${faDay(cell.date)} · ${result}`
}

function ProfileCalendar({ today, activity }) {
  const { cells, played } = buildCalendar(today, activity)
  return (
    <section className="profile-card profile-calendar" aria-label="تقویم فعالیت">
      <div className="profile-calendar-head">
        <h2>۱۰ هفته‌ی اخیر</h2>
        <span>{played ? `${faNumber(played)} روز بازی شده` : 'هنوز بازی‌ای نکردی'}</span>
      </div>
      <div
        className="heatmap"
        role="img"
        aria-label={`تقویم ده هفته‌ی اخیر؛ ${faNumber(played)} روز بازی شده. هر مربع یک روز است و هر چه روشن‌تر باشد امتیاز آن روز بیشتر بوده`}
      >
        {cells.map((cell) => (
          <i key={cell.date} className={`lv${cell.level}${cell.future ? ' future' : ''}`} title={cellTitle(cell)} />
        ))}
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        <span>باخت</span>
        <i className="lv1" />
        <span className="heatmap-legend-gap">امتیاز کم</span>
        <i className="lv2" />
        <i className="lv3" />
        <i className="lv4" />
        <span>زیاد</span>
      </div>
    </section>
  )
}

export default ProfileCalendar
