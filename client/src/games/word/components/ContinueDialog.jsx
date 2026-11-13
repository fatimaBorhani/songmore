// بعد از حدس ششمِ غلط: ادامه بدم یا جواب رو ببینم؟ (باید یکی رو انتخاب کنه، پس با کلیک بیرون بسته نمی‌شه)
function ContinueDialog({ busy, onContinue, onGiveUp }) {
  return (
    <div className="help-backdrop continue-backdrop">
      <div className="help-dialog continue-dialog" role="dialog" aria-modal="true" aria-labelledby="continue-title">
        <span className="continue-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12c-1.8-2.4-3.2-4-5-4a4 4 0 0 0 0 8c1.8 0 3.2-1.6 5-4zm0 0c1.8 2.4 3.2 4 5 4a4 4 0 0 0 0-8c-1.8 0-3.2 1.6-5 4z" />
          </svg>
        </span>
        <div className="continue-text">
          <h2 id="continue-title">حدس‌هات تموم شد</h2>
          <p>می‌خوای بدون محدودیت ادامه بدی تا کلمه رو پیدا کنی؟ این کلمه توی نتیجه‌ی امروزت باخت حساب می‌شه.</p>
        </div>
        <div className="continue-actions">
          <button type="button" className="primary-button" onClick={onContinue} autoFocus>
            ادامه می‌دم
          </button>
          <button type="button" className="ghost-button" onClick={onGiveUp} disabled={busy}>
            جواب رو ببینم
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContinueDialog
