import { faNumber } from '../../../shared/format.js'
import { MAX_POINTS_PER_SONG, songVerdict } from '../lyrics.js'

// کارت سرمه‌ای آخر هر آهنگ: امتیاز روی برچسب خردلی، یه جمله و دکمه‌ی بعدی
function SongEnd({ points, last, onNext }) {
  return (
    <section className="lyrics-end" aria-label="نتیجه‌ی آهنگ">
      <div className="lyrics-end-row">
        <div className="lyrics-score">
          <b>{faNumber(points)}</b>
          <small>از {faNumber(MAX_POINTS_PER_SONG)}</small>
        </div>
        <b className="lyrics-verdict">{songVerdict(points)}</b>
      </div>
      <button type="button" className="lyrics-next" onClick={onNext}>
        {last ? 'نتیجه‌ی امروز' : 'آهنگ بعدی'}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      </button>
    </section>
  )
}

export default SongEnd
