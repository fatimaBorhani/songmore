// قاب تمام‌صفحه‌ی مشترک سه مرحله (حفظ کردن، ساختن، نتیجه): یه قاب مشکی دور تا دور صفحه
// و رنگ توی یه کادر گرد داخلش؛ اندازه‌ی رنگ توی هر سه مرحله یکیه.
// panel: کارت پایین صفحه (اسلایدرها یا امتیاز) که روی رنگ میاد
function Scene({ label, background, ink, children, panel }) {
  return (
    <section className="color-full" aria-label={label}>
      <div className="color-canvas" style={{ background, color: ink }}>
        {children}
        {panel && <div className="color-panel">{panel}</div>}
      </div>
    </section>
  )
}

export default Scene
