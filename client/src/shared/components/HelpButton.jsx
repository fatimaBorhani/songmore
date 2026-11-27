// دکمه‌ی چراغ: راهنمای بازی رو باز می‌کنه (توی همه‌ی بازی‌ها یه شکل)
function HelpButton({ onClick }) {
  return (
    <button type="button" className="help-button" aria-label="راهنمای بازی" title="راهنمای بازی" onClick={onClick}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V16h5v-.2c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" />
      </svg>
    </button>
  )
}

export default HelpButton
