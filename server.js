
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// تحسين الإعدادات للتسجيلات الكبيرة
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// مسار API للتحقق من الفترة التجريبية
app.post('/api/check-trial', (req, res) => {
  const { deviceId } = req.body;

  // هنا يمكن استبدال البيانات الثابتة بمنطق حقيقي مع قاعدة بيانات
  res.json({ status: 'active', remaining_days: 7 });
});

// تقديم الملفات الثابتة من مجلد dist
app.use(express.static(path.join(__dirname, 'dist')));

// catch-all route لتعمل React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// بدء السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
