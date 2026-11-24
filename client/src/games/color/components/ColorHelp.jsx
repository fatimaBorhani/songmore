import { faNumber } from "../../../shared/format.js";
import HelpDialog from "../../../shared/components/HelpDialog.jsx";

// راهنمای حافظه‌ی رنگ: سه اسلاید؛ خود پنجره مشترکه (shared/components/HelpDialog.jsx)
// rounds: تعداد رنگ‌های هر روز، seconds: چند ثانیه رنگ دیده می‌شه (هر دو از سرور)
function ColorHelp({ rounds, seconds, onClose }) {
  const slides = [
    {
      title: "هدف بازی",
      body: (
        <>
          <p>
            هر روز {faNumber(rounds)} رنگ داری. هر رنگ رو {faNumber(seconds)}{" "}
            ثانیه نگاه کن (پلک نزن!)، بعد غیب می‌شه و باید از حافظه دوباره
            بسازیش.
          </p>
          <div className="color-help-swatches" aria-hidden="true">
            <span style={{ background: "hsl(205 80% 55%)" }} />
            <span className="arrow">←</span>
            <span style={{ background: "hsl(212 70% 50%)" }} />
          </div>
        </>
      ),
    },
    {
      title: "ساختن رنگ",
      body: (
        <ul className="help-list">
          <li>
            <b>رنگ‌مایه:</b> چه رنگیه؛ قرمز، زرد، سبز، آبی و بقیه‌ی رفقا.
          </li>
          <li>
            <b>اشباع:</b> چقدر پررنگه یا کدره.
          </li>
          <li>
            <b>روشنی:</b> چقدر روشنه یا تیره.
          </li>
          <li>
            اسلایدرها هر دور از یه رنگ الکی شروع می‌شن که گولت بزنن؛ وقتی راضی
            بودی «ثبت رنگ» رو بزن.
          </li>
        </ul>
      ),
    },
    {
      title: "امتیاز",
      body: (
        <ul className="help-list">
          <li>هر رنگ از {faNumber(10)} امتیاز داره؛ هر چی نزدیک‌تر، بیشتر.</li>
          <li>جمع امتیاز روز از {faNumber(rounds * 10)} حساب می‌شه.</li>
          <li>رنگ‌مایه رو درست بزنی جایزه داری؛ خیلی پرت بزنی یه کم جریمه.</li>
          <li>تیک‌تیک ساعت استرست می‌ده؟ با دکمه‌ی بلندگو خاموشش کن.</li>
          <li>هر شب نیمه‌شب رنگ‌های تازه میان.</li>
        </ul>
      ),
    },
  ];
  return <HelpDialog slides={slides} onClose={onClose} />;
}

export default ColorHelp;
