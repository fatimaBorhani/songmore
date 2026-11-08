// سه اسلایدر رنگ: رنگ‌مایه، اشباع و روشنی (HSB). اسلایدرها input واقعی‌ان (با کیبورد و لمس کار می‌کنن)
import { faNumber } from '../../../shared/format.js'
import { sliderTracks } from '../color.js'

const SLIDERS = [
  { key: 'h', id: 'color-hue', label: 'رنگ‌مایه', max: 360, unit: '°', valueText: (v) => `${v} درجه` },
  { key: 's', id: 'color-sat', label: 'اشباع', max: 100, unit: '٪', valueText: (v) => `${v} درصد` },
  { key: 'b', id: 'color-bri', label: 'روشنی', max: 100, unit: '٪', valueText: (v) => `${v} درصد` },
]

function Sliders({ hsb, onChange, disabled }) {
  const tracks = sliderTracks(hsb)
  return (
    <div className="color-sliders">
      {SLIDERS.map(({ key, id, label, max, unit, valueText }) => (
        <div key={key} className="color-slider">
          <label htmlFor={id}>
            <span>{label}</span>
            <b dir="ltr">
              {faNumber(hsb[key])}
              {unit}
            </b>
          </label>
          <input
            id={id}
            className="color-range"
            dir="ltr"
            type="range"
            min="0"
            max={max}
            step="1"
            value={hsb[key]}
            disabled={disabled}
            aria-valuetext={valueText(hsb[key])}
            style={{ '--track': tracks[key] }}
            onChange={(e) => onChange({ ...hsb, [key]: Number(e.target.value) })}
          />
        </div>
      ))}
    </div>
  )
}

export default Sliders
