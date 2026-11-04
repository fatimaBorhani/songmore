import { useEffect } from 'react'
import { Link } from 'react-router'
import { SITE_NAME } from '../shared/site.js'
import './home.css'

// وقتی آدرسی رو باز کنن که وجود نداره
function NotFoundPage() {
  useEffect(() => {
    document.title = `پیدا نشد · ${SITE_NAME}`
  }, [])

  return (
    <main className="home-page not-found">
      <h1>این صفحه پیدا نشد</h1>
      <p>شاید آدرس اشتباه تایپ شده.</p>
      <Link to="/" className="ghost-button">
        برگشت به صفحه‌ی اول
      </Link>
    </main>
  )
}

export default NotFoundPage
