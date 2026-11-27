// راهنمای جورچین: سه اسلاید با مثال کاشی‌ها؛ خود پنجره مشترکه (shared/components/HelpDialog.jsx)
import HelpDialog from "../../../shared/components/HelpDialog.jsx";

function Example({ word, index, result, text }) {
  return (
    <div className="help-example">
      <div className="help-tiles" aria-hidden="true">
        {Array.from(word).map((letter, i) => (
          <span
            key={i}
            className={`tile small ${i === index ? result : "plain"}`}
          >
            {letter}
          </span>
        ))}
      </div>
      <p>{text}</p>
    </div>
  );
}

// هر اسلاید یه توضیح کوتاه + یه مثال
const SLIDES = [
  {
    title: "هدف بازی",
    body: (
      <>
        <p>
          هر روز سه تا کلمه منتظرتن: ۳ حرفی، ۴ حرفی و ۵ حرفی. برای هر کدوم ۶ حدس
          داری و رنگ خونه‌ها مثل یه رفیق دلسوز بهت می‌گه چقدر نزدیکی.
        </p>
        <Example
          word="پرواز"
          index={0}
          result="correct"
          text="«پ» هم توی کلمه هست، هم جاش درسته. آفرین!"
        />
      </>
    ),
  },
  {
    title: "جای درست و غلط",
    body: (
      <>
        <Example
          word="سفارش"
          index={3}
          result="present"
          text="«ر» هست، ولی جاش اینجا نیست؛ یه کم جابه‌جاش کن."
        />
        <Example
          word="کاشتن"
          index={2}
          result="absent"
          text="«ش» کلاً توی این کلمه نیست. بی‌خیالش شو."
        />
      </>
    ),
  },
  {
    title: "چند نکته",
    body: (
      <ul className="help-list">
        <li>«آ» و «ا» دو تا حرف جدان؛ قاطی‌شون نکن.</li>
        <li>فقط کلمه‌های واقعی فارسی؛ «ججججج» قبول نیست!</li>
        <li>
          ۶ حدس تموم شد؟ می‌تونی ادامه بدی تا پیداش کنی، ولی دیگه برد حساب
          نمی‌شه.
        </li>
        <li>
          کلمه‌ی درستت رو قبول نکردیم؟ «فکر می‌کنم درسته» رو بزن؛ ما شرمنده
          می‌شیم و بررسیش می‌کنیم.
        </li>
        <li>
          روی کامپیوتر با کیبورد خودت تایپ کن: <kbd>Enter</kbd> ثبت،{" "}
          <kbd>Backspace</kbd> پاک کردن.
        </li>
        <li>هر شب نیمه‌شب کلمه‌های تازه میان.</li>
      </ul>
    ),
  },
];

function WordHelp({ onClose }) {
  return <HelpDialog slides={SLIDES} onClose={onClose} />;
}

export default WordHelp;
