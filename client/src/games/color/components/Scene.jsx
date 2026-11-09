// کارت رنگ مشترک سه مرحله (حفظ کردن، ساختن، نتیجه): وسط صفحه و توی هر سه مرحله یه اندازه
// panel: کارت تیره‌ی پایین کارت (اسلایدرها) که روی رنگ میاد
function Scene({ label, background, ink, children, panel }) {
  return (
    <section className="color-stage" aria-label={label} style={{ background, color: ink }}>
      {children}
      {panel && <div className="color-panel">{panel}</div>}
    </section>
  )
}

export default Scene
