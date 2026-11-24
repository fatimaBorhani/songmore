import { faNumber } from "../../../shared/format.js";
import HelpDialog from "../../../shared/components/HelpDialog.jsx";

// راهنمای «صد جور»: سه اسلاید؛ خود پنجره مشترکه (shared/components/HelpDialog.jsx)
// daily: سؤال‌های هر روز، more: تعداد «سؤال دیگه» (هر دو از سرور)
function SurveyHelp({ daily, more, onClose }) {
  const slides = [
    {
      title: "چی کار کنم؟",
      body: (
        <ul className="help-list">
          <li>
            سؤال رو بخون و اولین چیزی که به ذهنت میاد رو بنویس. فکر زیادی ممنوع!
          </li>
          <li>جواب درست و غلط نداره؛ قول.</li>
          <li>چیزی به ذهنت نرسید؟ «رد کردن» رو بزن، دلخور نمی‌شیم.</li>
        </ul>
      ),
    },
    {
      title: "چند تا سؤال؟",
      body: (
        <ul className="help-list">
          <li>هر روز {faNumber(daily)} سؤال تازه داری.</li>
          <li>
            بازم خواستی؟ «{faNumber(more)} سؤال دیگه» هست، هر چقدر دلت خواست.
          </li>
          <li>اول سؤال‌هایی میان که به کامل شدن نزدیک‌ترن.</li>
          <li>آخر کار می‌تونی یه سؤال هم خودت پیشنهاد بدی.</li>
        </ul>
      ),
    },
    {
      title: "جواب‌ها کجا می‌رن؟",
      body: (
        <ul className="help-list">
          <li>جواب‌ها ناشناس ذخیره می‌شن و ازشون بازی‌های بعدی ساخته می‌شه.</li>
          <li>هدف جمعی: هر سؤال به {faNumber(100)} جواب برسه.</li>
          <li>جواب بقیه رو نمی‌بینی، وگرنه بازی بعدی لو می‌ره!</li>
          <li>امتیاز نداره، ولی توی پروفایلت بج جمع می‌کنی.</li>
        </ul>
      ),
    },
  ];
  return <HelpDialog slides={slides} onClose={onClose} />;
}

export default SurveyHelp;
