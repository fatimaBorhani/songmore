import HelpDialog from '../../../shared/components/HelpDialog.jsx'

// راهنمای «شعر یادت نره» (خود پنجره مشترکه: shared/components/HelpDialog.jsx)
// خط‌های نمونه ساختگی‌ان، از هیچ آهنگ واقعی نیستن
function LyricsHelp({ onClose }) {
  const slides = [
    {
      title: 'هدف بازی',
      body: (
        <>
          <p>هر روز سه تیکه آهنگ داری. هر تیکه پخش می‌شه و درست قبل از یه جای خوبش می‌ایسته.</p>
          <p>نوبت توئه: دو خط بعدی رو از حفظ بنویس. ببینیم چقدر آهنگ‌گوشی!</p>
        </>
      ),
    },
    {
      title: 'امتیاز',
      body: (
        <ul className="help-list lyrics-help-grades">
          <li>
            <span className="lyrics-mark ok" aria-hidden="true" /> <b>درست:</b> تقریباً همونه، ۲ امتیاز. فاصله و نیم‌فاصله مهم نیست.
          </li>
          <li>
            <span className="lyrics-mark close" aria-hidden="true" /> <b>نزدیک:</b> نصفش رو یادت بود، ۱ امتیاز.
          </li>
          <li>
            <span className="lyrics-mark wrong" aria-hidden="true" /> <b>غلط:</b> این یکی پرید، ۰.
          </li>
          <li>هر آهنگ تا ۴ امتیاز، کل روز تا ۱۲.</li>
        </ul>
      ),
    },
    {
      title: 'پخش و متن',
      body: (
        <ul className="help-list">
          <li>«پخش دوباره» کل تیکه رو از اول پخش می‌کنه، هر چند بار که بخوای.</li>
          <li>روی هر خط بزنی، آهنگ از همون خط پخش می‌شه.</li>
          <li>متن خودش با آهنگ جلو می‌ره؛ اگه خودت اسکرول کنی یه چند ثانیه صبر می‌کنه.</li>
          <li>بعد از ثبت جواب، بقیه‌ی آهنگ هم پخش می‌شه تا ببینی چی بوده.</li>
        </ul>
      ),
    },
  ]
  return <HelpDialog slides={slides} onClose={onClose} />
}

export default LyricsHelp
