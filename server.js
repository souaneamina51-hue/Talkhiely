
import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API route مثال
app.post('/api/check-trial', (req, res) => {
  const { deviceId } = req.body;
  // هنا يمكن إضافة منطق حقيقي للفترة التجريبية
  res.json({ status: 'active', remaining_days: 5, deviceId });
});

// Serve React build
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route لجميع المسارات غير المعرفة
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
