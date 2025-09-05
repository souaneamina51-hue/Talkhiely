
// server.js

// 1. استيراد المكتبات اللازمة
const express = require('express');
const cors = require('cors');
const path = require('path');

// 2. إعداد التطبيق والمنفذ
const app = express();
// استخدام متغير البيئة PORT الخاص بـ Replit أو استخدام 5000 كقيمة افتراضية
const PORT = process.env.PORT || 5000;

// 3. تفعيل الـ Middleware
app.use(cors()); // لتجنب مشاكل CORS
app.use(express.json()); // لاستقبال بيانات JSON من الواجهة الأمامية

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
    return res.json({ status: 'active', remaining_days: TRIAL_DAYS });
  }
});

// 6. خدمة الملفات الثابتة لتطبيق React
// تأكد من أن تطبيق React الخاص بك تم بناؤه وأن ملفاته موجودة في مجلد "dist"
app.use(express.static(path.join(__dirname, 'dist')));

// 7. المسار الشامل (Catch-all Route) لتوجيه الطلبات
// **ملاحظة: هذا المسار يجب أن يكون آخر مسار في الملف لتجنب الأخطاء**
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 8. تشغيل الخادم
app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ: ${PORT}`);
});