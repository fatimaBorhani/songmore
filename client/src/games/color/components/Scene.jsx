// چیدمان مشترک سه مرحله (حفظ کردن، ساختن، نتیجه): «صحنه»ی رنگی با اندازه‌ی ثابت + کارت پایین/کنار + دکمه
// چون اندازه‌ها همیشه یکیه، با عوض شدن مرحله صفحه نمی‌پره
function Scene({ stage, children, action }) {
  return (
    <div className="color-scene">
      {stage}
      <div className="color-side">
        <section className="color-side-card">{children}</section>
        {action}
      </div>
    </div>
  )
}

export default Scene
