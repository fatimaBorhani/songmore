import wordmarkDay from '../../assets/logo/wordmark-day.svg'
import wordmarkNight from '../../assets/logo/wordmark-night.svg'
import markDay from '../../assets/logo/mark-day.svg'
import markNight from '../../assets/logo/mark-night.svg'

// لوگوی جورستون؛ دو نسخه داره: مشکی برای روز و سفید برای شب.
// هر دو عکس توی صفحه هستن و CSS (آخر shared.css) اونی که به تم نمی‌خوره رو قایم می‌کنه.
const KINDS = {
  wordmark: { day: wordmarkDay, night: wordmarkNight }, // اسم کامل با «ر» نت‌شکل
  mark: { day: markDay, night: markNight }, // فقط نت
}

function Logo({ kind = 'wordmark', className = '', alt = '' }) {
  const files = KINDS[kind]
  return (
    <>
      <img src={files.day} alt={alt} className={`${className} logo-day`} />
      <img src={files.night} alt={alt} className={`${className} logo-night`} aria-hidden="true" />
    </>
  )
}

export default Logo
