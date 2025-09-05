
import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const TRIAL_DAYS = 7;

// إعدادات CORS محسنة
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

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// معالج preflight requests
app.options('*', cors(corsOptions));

// قاعدة بيانات مؤقتة للفترات التجريبية
const trialDatabase = new Map();

// نقطة النهاية للتحقق من الفترة التجريبية
app.post('/api/check-trial', (req, res) => {
  try {
    console.log('📨 استقبال طلب تحقق من الفترة التجريبية:', req.body);
    
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ status: 'error', message: 'معرّف الجهاز مطلوب.' });
    }

    // إذا كان المعرّف موجوداً في قاعدة البيانات
    if (trialDatabase.has(deviceId)) {
      const trialData = trialDatabase.get(deviceId);
      const startDate = new Date(trialData.trialStartDate);
      const now = new Date();
      const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, TRIAL_DAYS - daysPassed);

      if (remainingDays > 0) {
        const response = { status: 'active', remaining_days: remainingDays };
        console.log('✅ إرسال استجابة:', response);
        return res.json(response);
      } else {
        const response = { status: 'expired', remaining_days: 0 };
        console.log('⏰ انتهت الفترة التجريبية:', response);
        return res.json(response);
      }
    }

    // إنشاء فترة تجريبية جديدة
    trialDatabase.set(deviceId, {
      trialStartDate: new Date().toISOString(),
      status: 'active'
    });
    const response = { status: 'active', remaining_days: TRIAL_DAYS };
    console.log('🆕 إنشاء فترة تجريبية جديدة:', response);
    return res.json(response);
    
  } catch (error) {
    console.error('❌ خطأ في API:', error);
    return res.status(500).json({ status: 'error', message: 'خطأ في الخادم' });
  }
});

// Serve React build
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route لجميع المسارات غير المعرفة
app.get('*', (req, res) => {
  // تأكد من أن الطلب ليس لـ API
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// معالج الأخطاء العام
app.use((error, req, res, next) => {
  console.error('خطأ عام في الخادم:', error);
  res.status(500).json({ status: 'error', message: 'خطأ داخلي في الخادم' });
});

// تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 التطبيق متاح على http://localhost:${PORT}`);
});
