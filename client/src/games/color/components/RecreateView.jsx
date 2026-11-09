// دور ساختن: همون کارت، این بار با رنگ تو (زنده با اسلایدرها عوض می‌شه)؛ اسلایدرها پایین کارت
import { faNumber } from '../../../shared/format.js'
import { hsbToCss, readableOn } from '../color.js'
import Scene from './Scene.jsx'
import Sliders from './Sliders.jsx'

function RecreateView({ hsb, onChange, onSubmit, busy, error, round, roundCount }) {
  return (
    <Scene
      label="رنگ تو"
      background={hsbToCss(hsb)}
      ink={readableOn(hsb)}
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
      <span className="color-round">
        {faNumber(round)} / {faNumber(roundCount)}
      </span>
      <span className="color-corner-end">رنگ تو</span>
    </Scene>
  )
}

export default RecreateView
