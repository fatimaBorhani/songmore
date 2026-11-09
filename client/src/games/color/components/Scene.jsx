// قاب تمام‌صفحه‌ی مشترک سه مرحله (حفظ کردن، ساختن، نتیجه): رنگ کل صفحه رو پر می‌کنه
// و توی هر سه مرحله یه اندازه‌ست. panel: کارت پایین صفحه (اسلایدرها یا امتیاز) که روی رنگ میاد
function Scene({ label, background, ink, children, panel }) {
  return (
    <section className="color-full" aria-label={label} style={{ background, color: ink }}>
      {children}
      {panel && <div className="color-panel">{panel}</div>}
    </section>
  )
}

export default Scene
