import { useEffect } from 'react'
import { Link } from 'react-router'
import { SITE_NAME } from '../shared/site.js'
import { faNumber } from '../shared/format.js'
import Logo from '../shared/components/Logo.jsx'
import './home.css'

// وقتی آدرسی رو باز کنن که وجود نداره: نت لوگو، ۴۰۴ و دکمه‌ی برگشت
function NotFoundPage() {
  useEffect(() => {
    document.title = `پیدا نشد · ${SITE_NAME}`
  }, [])

  return (
    <main className="home-page not-found">
      <Logo kind="mark" className="not-found-mark" />
      <span className="not-found-code">{faNumber(404)}</span>
      <h1>این صفحه پیدا نشد</h1>
      <p>این آهنگ توی آلبوم ما نیست! برگرد صفحه‌ی اول و یه بازی دیگه بزن.</p>
      <Link to="/" className="ghost-button">
        برگرد صفحه‌ی اول ←
      </Link>
    </main>
  )
}

export default NotFoundPage
