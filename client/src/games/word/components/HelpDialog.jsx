// پنجره‌ی راهنمای بازی
import { useEffect, useRef } from 'react'

function Example({ word, index, result, text }) {
  return (
    <div className="help-example">
      <div className="help-tiles" aria-hidden="true">
        {Array.from(word).map((letter, i) => (
          <span key={i} className={`tile small ${i === index ? result : 'plain'}`}>
            {letter}
          </span>
        ))}
      </div>
      <p>{text}</p>
    </div>
  )
}

function HelpDialog({ onClose }) {
  const closeButton = useRef(null)
  useEffect(() => {
    closeButton.current?.focus()
  }, [])

  return (
    <div className="help-backdrop" onClick={onClose}>
      <div
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="help-head">
          <h2 id="help-title">چطوری بازی کنم؟</h2>
          <button ref={closeButton} type="button" className="icon-button" aria-label="بستن" onClick={onClose}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p>کلمه‌ی ۵ حرفی امروز رو با ۶ حدس پیدا کن. بعد از هر حدس، رنگ خونه‌ها نشون می‌ده چقدر نزدیک شدی.</p>
        <Example word="پرواز" index={0} result="correct" text="«پ» توی کلمه هست و جاش هم درسته." />
        <Example word="سفارش" index={3} result="present" text="«ر» توی کلمه هست ولی جای دیگه." />
        <Example word="کاشتن" index={2} result="absent" text="«ش» اصلاً توی کلمه نیست." />
        <p className="help-note">«آ» و «ا» دو حرف جدا حساب می‌شن. هر روز نیمه‌شب کلمه عوض می‌شه.</p>
      </div>
    </div>
  )
}

export default HelpDialog
