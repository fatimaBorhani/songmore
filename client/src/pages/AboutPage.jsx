import { useEffect } from 'react'
import { Link } from 'react-router'
import { GAMES } from '../games/index.js'
import { SITE_NAME } from '../shared/site.js'
import { faNumber } from '../shared/format.js'
import GameIcon from '../shared/components/GameIcon.jsx'
import lockup from '../assets/logo/lockup-night.svg'
import './about.css'

// صفحه‌ی «درباره» (آدرس /about): سایت چطوری کار می‌کنه + درباره‌ی ما
// (منبع‌ها و لایسنس‌ها فعلاً عمداً نیستن؛ بعداً به شکلی که خواستیم اضافه می‌شن)
// روی کامپیوتر چینش بنتو با تصویر؛ روی گوشی یه فهرست جمع‌وجور (فقط با CSS عوض می‌شه)

// متن «درباره‌ی ما» و راه ارتباط: فعلاً موقت؛ هر وقت آماده شد فقط همین‌جا عوض بشه
// متن «درباره‌ی ما»: هر خط یه پاراگراف
const ABOUT_US = [
  'قضیه از Songless شروع شد. دیدیم توش استعداد نداریم، گفتیم ایرانیش کنیم، شاید اینجا استعداد داشته باشیم :)',
  'این‌طوری جورزیک ساخته شد. بعدش کم‌کم بازی‌های دیگه هم اضافه شدن و جورستون شد جایی که همیشه یه چیزی هست که باید جورش کنی. این مسیر هنوز ادامه داره.',
]
const CONTACT_URL = '' // مثلاً 'mailto:...' یا لینک تلگرام؛ تا خالیه دکمه نمیاد

// آیکن‌های خطی کوچیک (به رنگ متن)
function Icon({ d, size = 20 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  people: 'M9 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6M3 20a6 6 0 0 1 12 0M17 7a2.5 2.5 0 1 0 0 5M15 20h6a4 4 0 0 0-4-4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  arrow: 'M19 12H5M11 6l-6 6 6 6',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
}

// یه کارت «چطوری کار می‌کنه»: روی کامپیوتر تصویر + متن بلند، روی گوشی یه ردیف با آیکن + متن کوتاه
function Fact({ name, icon, title, long, short, children }) {
  return (
    <div className={`about-card about-fact about-${name}`}>
      <div className="about-art" aria-hidden="true">
        {children}
      </div>
      <span className="about-fact-icon">
        <Icon d={icon} size={18} />
      </span>
      <span className="about-fact-text">
        <b>{title}</b>
        <span className="about-long">{long}</span>
        <span className="about-short">{short}</span>
      </span>
    </div>
  )
}

function AboutPage() {
  useEffect(() => {
    document.title = `درباره · ${SITE_NAME}`
  }, [])

  const games = GAMES.filter((g) => g.ready)

  return (
    <main className="about-page">
      <div className="about-grid">
        {/* کارت آبی بالا با گرامافون */}
        <section className="about-hero">
          <span className="about-record" aria-hidden="true">
            <span className="g1" />
            <span className="g2" />
            <span className="g3" />
            <span className="shine" />
            <span className="label" />
          </span>
          <span className="about-sticker">هر شب تازه!</span>
          {/* لوگوی عمودی (نت بالا، اسم پایین)؛ کارت همیشه تیره‌ست، پس نسخه‌ی سفید */}
          <img src={lockup} alt={SITE_NAME} className="about-lockup" />
          <h1>روزی چند دقیقه بازی</h1>
          <p>قول می‌دیم فقط چند دقیقه‌ست. خب… شاید یه کم بیشتر.</p>
        </section>

        <Fact
          name="night"
          icon={ICONS.moon}
          title="هر شب نیمه‌شب"
          long="وقتی همه خوابن، بازی‌ها عوض می‌شن. جغدها اول بازی می‌کنن."
          short="وقتی همه خوابن، بازی‌ها عوض می‌شن. جغدها اول بازی می‌کنن."
        >
          <span className="about-night-top">
            <Icon d={ICONS.moon} size={18} />
            به وقت تهران
            <span className="about-zzz">zzz</span>
          </span>
          <b className="about-clock" dir="ltr">
            ۰۰:۰۰
          </b>
        </Fact>

        {/* لیگ هفته: روی گوشی هم تصویرش می‌مونه */}
        <div className="about-card about-league">
          <div className="about-league-head">
            <b>لیگ هفته</b>
            <Link to="/weekly">جدول ←</Link>
          </div>
          <div className="about-mini-table" aria-hidden="true">
            <span className="row">
              <b>{faNumber(1)}</b>
              <Icon d={ICONS.crown} size={16} />
              <i style={{ width: 110 }} />
            </span>
            <span className="row hide-phone">
              <b>{faNumber(2)}</b>
              <i style={{ width: 80 }} />
            </span>
            <span className="row me">
              <b>{faNumber(3)}</b>
              <strong>تو</strong>
              <em>بالا اومدی</em>
            </span>
          </div>
          <span className="about-league-text">
            هر بازی تا {faNumber(30)} امتیاز. از شنبه شروع می‌شه و جمعه شب معلوم می‌شه کی تاج این هفته رو می‌ذاره سرش.
          </span>
        </div>

        <Fact
          name="together"
          icon={ICONS.people}
          title="همه با هم، یه بازی"
          long="امروز همه همون آهنگ رو حدس می‌زنن. پس اگه دوستت زودتر پیداش کرد، دیگه بهونه‌ای نیست!"
          short="اگه دوستت زودتر پیداش کرد، دیگه بهونه‌ای نیست!"
        >
          <span className="about-faces">
            <span />
            <span />
            <span />
            <span />
          </span>
          <Icon d={ICONS.arrow} size={26} />
          <span className="about-one-game">
            <GameIcon type="wave" size={30} />
          </span>
        </Fact>

        <Fact
          name="hint"
          icon={ICONS.bulb}
          title="گیر کردی؟"
          long="چراغ بالای هر بازی رو بزن. جواب رو لو نمی‌ده، ولی قانون‌ها رو می‌گه."
          short="چراغ بالای هر بازی رو بزن. جواب رو لو نمی‌ده!"
        >
          <span className="about-bulb">
            <Icon d={ICONS.bulb} size={34} />
          </span>
        </Fact>

        <Fact
          name="join"
          icon={ICONS.trophy}
          title="بیا تو لیگ"
          long="بازی بدون ثبت‌نام هم می‌شه، ولی فقط با حساب اسمت توی لیگ هفته میاد و آمارت هم گم نمی‌شه."
          short="با ثبت‌نام اسمت توی لیگ میاد و آمارت گم نمی‌شه."
        >
          <span className="about-guest">مهمان</span>
          <Icon d={ICONS.arrow} size={22} />
          <span className="about-in-league">
            <Icon d={ICONS.trophy} size={15} />
            توی لیگ
          </span>
        </Fact>

        {/* فقط روی کامپیوتر */}
        <div className="about-card about-games">
          <div className="about-art" aria-hidden="true">
            {games.map((g) => (
              <span key={g.id} className="about-game-tile">
                <GameIcon type={g.icon} size={22} />
              </span>
            ))}
            <span className="about-game-tile empty">+</span>
          </div>
          <span className="about-fact-text">
            <b>{faNumber(games.length)} تا بازی (فعلاً!)</b>
            <span>از آهنگ و کلمه تا رنگ. اون خونه‌ی خالی رو برای بعد نگه داشتیم.</span>
          </span>
        </div>
      </div>

      {/* درباره‌ی ما و راه ارتباط */}
      <section className="about-us" aria-labelledby="about-us-title">
        <div className="about-us-card">
          <span className="about-quote" aria-hidden="true">
            »
          </span>
          <h2 id="about-us-title">درباره‌ی ما</h2>
          {ABOUT_US.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <div className="about-contact">
          <b>غر بزن، ما گوش می‌دیم</b>
          <p>
            از آهنگی که دلت می‌خواد بیاد تا کلمه‌ای که فکر می‌کنی جاش خالیه، یا هر مشکلی که دیدی. تعریف هم قبول می‌کنیم!
          </p>
          {CONTACT_URL ? (
            <a className="about-contact-button" href={CONTACT_URL} target="_blank" rel="noreferrer">
              <Icon d={ICONS.mail} size={18} />
              بهمون پیام بده
            </a>
          ) : (
            <span className="about-contact-soon">راه ارتباط به‌زودی اینجا میاد.</span>
          )}
        </div>
      </section>

    </main>
  )
}

export default AboutPage
