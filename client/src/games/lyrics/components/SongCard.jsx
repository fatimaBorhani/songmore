import { clock } from '../lyrics.js'
import { faNumber } from '../../../shared/format.js'

// کارت آهنگ بالای صفحه که خودش پخش‌کننده‌ست: گرامافون کوچیک (موقع پخش می‌چرخه)،
// اسم آهنگ، امتیاز، دکمه‌ی «پخش دوباره» و نوار زمان با جای توقف (نوبت تو)
function SongCard({ slot, now, playing, showAgain, onAgain }) {
  const end = slot.endMs
  const pct = Math.min(100, Math.max(0, (now / end) * 100))
  const stopPct = (slot.questionAtMs / end) * 100
  return (
    <section className="lyrics-songcard" aria-label="آهنگ">
      <div className="lyrics-songrow">
        <span className={`lyrics-record mini${playing ? ' spinning' : ''}`} aria-hidden="true">
          <i />
        </span>
        <div className="lyrics-songname">
          <b>{slot.title}</b>
          <small>{slot.artist}</small>
        </div>
        {slot.finished && (
          <span className="lyrics-points" dir="ltr" role="status" aria-label={`${faNumber(slot.points)} امتیاز`}>
            <span className="num-sep">+</span>
            {faNumber(slot.points)}
          </span>
        )}
        {showAgain && (
          <button type="button" className="lyrics-again" onClick={onAgain}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            پخش دوباره
          </button>
        )}
      </div>
      <div className="lyrics-mini">
        <div className="lyrics-track" role="progressbar" aria-label="زمان پخش" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <div className="lyrics-track-fill" style={{ width: `${pct}%` }} />
          {!slot.finished && <span className="lyrics-track-stop" style={{ right: `${stopPct}%` }} aria-hidden="true" />}
        </div>
        <span className="lyrics-time">
          {clock(now)}
          <span className="num-sep">/</span>
          {clock(end)}
        </span>
        {playing && (
          <span className="lyrics-eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    </section>
  )
}

export default SongCard
