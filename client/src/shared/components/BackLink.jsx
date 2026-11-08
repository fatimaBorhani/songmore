// دکمه‌ی برگشت به صفحه‌ی اول (انتخاب بازی)؛ فلش توی راست‌به‌چپ سمت راسته
import { Link } from 'react-router'

function BackLink({ to = '/', children = 'همه‌ی بازی‌ها' }) {
  return (
    <Link to={to} className="back-link">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
      <span>{children}</span>
    </Link>
  )
}

export default BackLink
