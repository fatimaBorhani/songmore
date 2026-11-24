import { useEffect } from 'react'
import { Link } from 'react-router'
import { GAMES } from '../games/index.js'
import { SITE_NAME } from '../shared/site.js'
import './about.css'

// صفحه‌ی «درباره» (آدرس /about): سایت چیه، بازی‌ها، آهنگ‌ها و ایده‌ها
// (منبع‌ها و لایسنس‌ها فعلاً عمداً نیستن؛ بعداً به شکلی که فاطمه بخواد اضافه می‌شن)
function AboutPage() {
  useEffect(() => {
    document.title = `درباره · ${SITE_NAME}`
  }, [])

  const games = GAMES.filter((g) => g.ready)

  return (
    <main className="about-page">
      <h1>درباره‌ی {SITE_NAME}</h1>
      <p className="about-lead">
        چند بازی کوتاه فارسی که هر روز نیمه‌شب به وقت تهران عوض می‌شن. بازی هر روز برای همه یکیه، پس می‌تونی نتیجه‌ت رو با
        دوستات مقایسه کنی. برای بازی کردن ثبت‌نام لازم نیست؛ ثبت‌نام فقط برای نگه داشتن آمار روی همه‌ی دستگاه‌هاست.
      </p>

      <section className="about-section" aria-labelledby="about-games">
        <h2 id="about-games">بازی‌ها</h2>
        <ul className="about-games">
          {games.map((g) => (
            <li key={g.id}>
              <Link to={g.path}>{g.title}</Link>
              <span>{g.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-music">
        <h2 id="about-music">آهنگ‌ها</h2>
        <p>
          توی «حدس آهنگ» فقط تیکه‌های چندثانیه‌ای از آهنگ‌ها پخش می‌شه و حق همه‌ی آهنگ‌ها برای خواننده‌ها و صاحبانشونه.
        </p>
      </section>

      <section className="about-section" aria-labelledby="about-ideas">
        <h2 id="about-ideas">ایده‌ها</h2>
        <p>
          ایده‌ی بعضی بازی‌ها از بازی‌های روزانه‌ای مثل Songless، Wordle، dialed و Contexto گرفته شده؛ قانون‌ها، ظاهر و داده‌ها
          برای فارسی از نو ساخته شدن.
        </p>
      </section>
    </main>
  )
}

export default AboutPage
