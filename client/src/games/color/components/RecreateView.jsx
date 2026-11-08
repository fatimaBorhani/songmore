// دور ساختن: رنگ تو (زنده با اسلایدرها عوض می‌شه)، کارت رنگ اصلیِ پنهان، اسلایدرها و دکمه‌ی ثبت
import { hsbToCss, readableOn } from '../color.js'
import Sliders from './Sliders.jsx'

function RecreateView({ hsb, onChange, onSubmit, busy }) {
  return (
    <div className="color-split color-recreate">
      <div className="color-preview-col">
        <div className="color-hidden">
          <span className="color-hidden-mark" aria-hidden="true">
            ؟
          </span>
          <span className="color-hidden-short">رنگ اصلی پنهانه</span>
          <span className="color-hidden-long">رنگ اصلی تا بعد از ثبت پنهانه</span>
        </div>
        <div className="color-preview" style={{ background: hsbToCss(hsb), color: readableOn(hsb) }}>
          <span>رنگ تو</span>
        </div>
      </div>

      <div className="color-panel-col">
        <section className="color-panel" aria-label="ساختن رنگ">
          <Sliders hsb={hsb} onChange={onChange} disabled={busy} />
        </section>
        <button type="button" className="color-btn" disabled={busy} onClick={onSubmit}>
          {busy ? 'در حال ثبت...' : 'ثبت رنگ'}
        </button>
      </div>
    </div>
  )
}

export default RecreateView
