// دور ساختن: همون صحنه، این بار با رنگ تو (زنده با اسلایدرها عوض می‌شه)؛ اسلایدرها و دکمه‌ی ثبت
import { hsbToCss, readableOn } from '../color.js'
import Scene from './Scene.jsx'
import Sliders from './Sliders.jsx'

function RecreateView({ hsb, onChange, onSubmit, busy }) {
  return (
    <Scene
      stage={
        <section className="color-stage" aria-label="رنگ تو" style={{ background: hsbToCss(hsb), color: readableOn(hsb) }}>
          <span className="color-stage-pill">رنگ اصلی تا بعد از ثبت پنهانه</span>
          <span className="color-stage-name">رنگ تو</span>
        </section>
      }
      action={
        <button type="button" className="color-btn" disabled={busy} onClick={onSubmit}>
          {busy ? 'در حال ثبت...' : 'ثبت رنگ'}
        </button>
      }
    >
      <Sliders hsb={hsb} onChange={onChange} disabled={busy} />
    </Scene>
  )
}

export default RecreateView
