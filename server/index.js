// سرور ساده‌ی تستی. فعلاً فقط یه route سلامتی داره.
import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} روشن شد`);
});
