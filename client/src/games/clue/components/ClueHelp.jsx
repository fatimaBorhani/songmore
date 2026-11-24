import { WARM_MAX } from "../clue.js";
import { faNumber } from "../../../shared/format.js";
import HelpDialog from "../../../shared/components/HelpDialog.jsx";
import GuessRow from "./GuessRow.jsx";

// راهنمای جوربندی: سه اسلاید؛ خود پنجره مشترکه (shared/components/HelpDialog.jsx)
// ردیف‌های نمونه همون GuessRow خود بازی‌ان، با رتبه‌های ساختگی
const SLIDES = [
  {
    title: "هدف بازی",
    body: (
      <>
        <p>
          یه کلمه این پشت قایم شده. هر کلمه‌ای حدس بزنی یه <b>رتبه</b> می‌گیره:
          هر چی معنیش نزدیک‌تر، عددش کوچیک‌تر. رتبه‌ی {faNumber(1)} یعنی خودشه؛
          پیداش کردی!
        </p>
        <div className="clue-help-rows" aria-hidden="true">
          <GuessRow guess={{ word: "دریا", rank: 4 }} />
          <GuessRow guess={{ word: "ماهی", rank: 860 }} />
        </div>
      </>
    ),
  },
  {
    title: "داغ یا سرد؟",
    body: (
      <>
        <p>هر چی نوار پشت کلمه پرتر، داغ‌تر!</p>
        <ul className="help-list">
          <li>آبی: رتبه‌ی {faNumber(WARM_MAX)} یا کمتر؛ داری گرم می‌شی.</li>
          <li>طوسی: هنوز وسط قطب شمالی.</li>
          <li>
            حدس‌ها از داغ به سرد مرتب می‌شن و آخرین حدست با یه فلش بالای لیست
            میاد.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "گیر کردی؟",
    body: (
      <ul className="help-list">
        <li>حدس بی‌نهایته، ولی هر چی کمتر، پزش بیشتر.</li>
        <li>از منوی «⋯»، «راهنما» یه کلمه‌ی نزدیک‌تر یواشکی بهت می‌ده.</li>
        <li>«تسلیم» هم هست… ولی ما بهت ایمان داریم.</li>
        <li>هر شب نیمه‌شب یه کلمه‌ی تازه قایم می‌کنیم.</li>
      </ul>
    ),
  },
];

function ClueHelp({ onClose }) {
  return <HelpDialog slides={SLIDES} onClose={onClose} />;
}

export default ClueHelp;
