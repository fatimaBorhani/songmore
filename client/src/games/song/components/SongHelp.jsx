import { STAGES } from "../stages.js";
import { faNumber, faSeconds } from "../../../shared/format.js";
import HelpDialog from "../../../shared/components/HelpDialog.jsx";

// راهنمای جورزیک: سه اسلاید؛ خود پنجره مشترکه (shared/components/HelpDialog.jsx)
// (مسابقه‌ای و تمرینی یه راهنما دارن)
const SLIDES = [
  {
    title: "هدف بازی",
    body: (
      <ul className="help-list">
        <li>هر روز {faNumber(3)} آهنگ داری، یکی‌یکی.</li>
        <li>
          اول فقط {faSeconds(STAGES[0])} ثانیه از آهنگ رو می‌شنوی؛ آره، کمتر از
          یه پلک زدن!
        </li>
        <li>اسم آهنگ یا خواننده رو بنویس و از لیست انتخابش کن.</li>
        <li>آهنگی که دنبالشی توی لیست نیست؟ آخر لیست «پیشنهادش بده» رو بزن.</li>
      </ul>
    ),
  },
  {
    title: "حدس و رد کردن",
    body: (
      <>
        <ul className="help-list">
          <li>برای هر آهنگ {faNumber(5)} حدس داری.</li>
          <li>«رد کردن» از حدس‌هات کم نمی‌کنه؛ فقط کلیپ رو بلندتر می‌کنه.</li>
          <li>
            آهنگ اشتباه بود ولی خواننده‌ش درست؟ کنار حدست «خواننده درسته» میاد؛ یعنی نزدیکی، یه
            آهنگ دیگه از همین خواننده رو امتحان کن!
          </li>
          <li>رد کردن‌ها که تموم شد، می‌تونی جواب رو ببینی (ولی امتیاز نه).</li>
        </ul>
        <div className="song-help-stages" aria-label="طول کلیپ در هر مرحله">
          {STAGES.map((s) => (
            <span key={s} dir="ltr">
              {faSeconds(s)}s
            </span>
          ))}
        </div>
      </>
    ),
  },
  {
    title: "امتیاز",
    body: (
      <ul className="help-list">
        <li>
          هر چی زودتر بشناسی، امتیاز بیشتر (تا {faNumber(10000)} برای هر آهنگ).
        </li>
        <li>هر حدس غلط {faNumber(1000)} امتیاز آب می‌کنه.</li>
        <li>عدد درشت بالای موج می‌گه اگه همین الان درست بزنی چقدر گیرت میاد.</li>
        <li>جمع امتیاز ۳ آهنگ امروز می‌ره توی جدول امتیاز امروز و لیگ هفته.</li>
        <li>
          «تمرینی» آهنگ بی‌نهایت داره؛ بدون امتیاز، بدون استرس. فقط توی فعالیت
          پروفایلت حساب می‌شه.
        </li>
        <li>هر شب نیمه‌شب آهنگ‌های تازه میان.</li>
      </ul>
    ),
  },
];

function SongHelp({ onClose }) {
  return <HelpDialog slides={SLIDES} onClose={onClose} />;
}

export default SongHelp;
