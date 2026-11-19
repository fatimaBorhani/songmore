import { useEffect } from 'react'
import { Link } from 'react-router'
import { GAMES } from '../games/index.js'
import { SITE_NAME } from '../shared/site.js'
import './about.css'

// منبع‌هایی که ازشون استفاده کردیم و لایسنس‌هاشون (بعضی لایسنس‌ها می‌گن باید یه جا اسمشون بیاد)
const SOURCES = [
  {
    name: 'ProtoQA',
    use: 'متن بیشتر سؤال‌های «صد نفر گفتن» از روی این مجموعه به فارسی برگردونده و بازبینی شده (فقط متن سؤال، نه جواب‌ها).',
    by: 'Boratko و همکاران، EMNLP 2020',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    url: 'https://github.com/iesl/protoqa-data',
  },
  {
    name: 'لیلک (Lilak)',
    use: 'لغت‌نامه‌ی کلمه‌هایی که توی واژه‌یاب و کلمه‌ی پنهان قبول می‌شن.',
    by: 'Copyright 2015 Mostafa Sedaghat Joo',
    license: 'Apache 2.0',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    url: 'https://github.com/b00f/lilak',
  },
  {
    name: 'mainwords',
    use: 'تعداد تکرار کلمه‌ها توی وبلاگ‌های فارسی؛ برای انتخاب جواب‌های آشنا.',
    by: 'ehsan957',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    url: 'https://github.com/ehsan957/mainwords',
  },
  {
    name: 'بردارهای کلمه‌ی fastText فارسی',
    use: 'نزدیکی معنی کلمه‌ها توی کلمه‌ی پنهان. داده‌ی بازی (بردارهای فشرده‌شده) هم با همین لایسنس منتشر می‌شه.',
    by: 'Grave و همکاران، Learning Word Vectors for 157 Languages، 2018',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    url: 'https://fasttext.cc/docs/en/crawl-vectors.html',
  },
  {
    name: 'فونت وزیرمتن',
    use: 'فونت همه‌ی متن‌های سایت.',
    by: 'صابر راستی‌کردار',
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://openfontlicense.org',
    url: 'https://github.com/rastikerdar/vazirmatn',
  },
]

// صفحه‌ی «درباره» (آدرس /about): سایت چیه، بازی‌ها، منبع‌ها و لایسنس‌ها
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

      <section className="about-section" aria-labelledby="about-sources">
        <h2 id="about-sources">منبع‌ها و لایسنس‌ها</h2>
        <ul className="about-sources">
          {SOURCES.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
              <p>{s.use}</p>
              <p className="about-meta">
                <span>{s.by}</span> ·{' '}
                <a href={s.licenseUrl} target="_blank" rel="noreferrer" dir="ltr">
                  {s.license}
                </a>
              </p>
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
