
// server.js

// 1. استيراد المكتبات اللازمة
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// للحصول على __dirname في ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. إعداد التطبيق والمنفذ
const app = express();
// استخدام متغير البيئة PORT الخاص بـ Replit أو استخدام 3000 كقيمة افتراضية
const PORT = process.env.PORT || 3000;

// 3. تفعيل الـ Middleware
const corsOptions = {
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Express server
    'https://*.replit.dev',  // Replit domains
    'https://*.replit.com',  // Replit domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions)); // لتجنب مشاكل CORS
app.use(express.json()); // لاستقبال بيانات JSON من الواجهة الأمامية

// معالج preflight requests
app.options('*', cors(corsOptions));

// 4. قاعدة بيانات مؤقتة للفترات التجريبية
const trialDatabase = new Map();
const TRIAL_DAYS = 7;

// دالة لمقارنة التواريخ
const isTrialExpired = (startDate) => {
  const trialEnd = new Date(startDate);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return new Date() > trialEnd;
};

// 5. نقطة النهاية (Endpoint) للتحقق من الفترة التجريبية
app.post('/api/check-trial', (req, res) => {
  try {
    console.log('📨 استقبال طلب تحقق من الفترة التجريبية:', req.body);
    
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ status: 'error', message: 'معرّف الجهاز مطلوب.' });
    }

  // إذا كان المعرّف موجوداً في قاعدة البيانات
  if (trialDatabase.has(deviceId)) {
    const trialStart = trialDatabase.get(deviceId).trialStartDate;
    if (isTrialExpired(trialStart)) {
      // إرسال استجابة "منتهية"
      return res.json({ status: 'expired', message: 'انتهت الفترة التجريبية.' });
    } else {
      // إرسال استجابة "نشطة"
      const remainingDays = Math.ceil((new Date(trialStart).getTime() + (TRIAL_DAYS * 24 * 60 * 60 * 1000) - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return res.json({ status: 'active', remaining_days: remainingDays });
    }
  } else {
    // إذا كان المعرّف جديداً، قم بتسجيله
    trialDatabase.set(deviceId, {
      trialStartDate: new Date().toISOString(),
      status: 'active'
    });
    const response = { status: 'active', remaining_days: TRIAL_DAYS };
    console.log('✅ إرسال استجابة:', response);
    return res.json(response);
  }
  } catch (error) {
    console.error('❌ خطأ في API:', error);
    return res.status(500).json({ status: 'error', message: 'خطأ في الخادم' });
  }
});

// 6. خدمة الملفات الثابتة لتطبيق React
// تأكد من أن تطبيق React الخاص بك تم بناؤه وأن ملفاته موجودة في مجلد "dist"
app.use(express.static(path.join(__dirname, 'dist')));

// 7. المسار الشامل (Catch-all Route) لتوجيه الطلبات
// **ملاحظة: هذا المسار يجب أن يكون آخر مسار في الملف لتجنب الأخطاء**
// أي Route غير موجود يوجّه لـ index.html (عشان React Router يشتغل)
app.use((req, res) => {
  // تأكد من أن الطلب ليس لـ API
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});


// 8. تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`الخادم يعمل على المنفذ: ${PORT}`);
  console.log(`يمكنك الوصول للتطبيق على: http://localhost:${PORT}`);
});
