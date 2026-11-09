// دور ساختن: رنگ تو با همون اندازه‌ی رنگ اصلی کل صفحه رو پر می‌کنه؛ اسلایدرها پایین صفحه روی رنگ‌ان
import { hsbToCss } from '../color.js'
import Scene from './Scene.jsx'
import Sliders from './Sliders.jsx'

function RecreateView({ hsb, onChange, onSubmit, busy, error }) {
  return (
    <Scene
      label="رنگ تو"
      background={hsbToCss(hsb)}
      panel={
        <>
          <Sliders hsb={hsb} onChange={onChange} disabled={busy} />
          {error && <p className="color-panel-error">{error}</p>}
          <button type="button" className="color-btn" disabled={busy} onClick={onSubmit}>
            {busy ? 'در حال ثبت...' : 'ثبت رنگ'}
          </button>
        </>
      }
    >
      <span className="color-pill color-pill-top">رنگ تو · رنگ اصلی پنهانه</span>
    </Scene>
  )
}

export default RecreateView
