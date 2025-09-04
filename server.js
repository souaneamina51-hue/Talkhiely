
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const TRIAL_DURATION_DAYS = 7;

// Middleware
app.use(cors());
app.use(express.json());

// مسار ملف قاعدة البيانات المؤقتة
const DB_PATH = path.join(__dirname, 'trials.json');

// قراءة قاعدة البيانات
async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // إنشاء ملف جديد إذا لم يكن موجوداً
    return {};
  }
}

// كتابة قاعدة البيانات
async function writeDatabase(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('خطأ في كتابة قاعدة البيانات:', error);
  }
}

// نقطة نهاية للتحقق من الفترة التجريبية
app.post('/api/check-trial', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ 
        error: 'معرف الجهاز مطلوب',
        status: 'error'
      });
    }

    const database = await readDatabase();
    const now = new Date();

    // التحقق من وجود الجهاز في قاعدة البيانات
    if (database[deviceId]) {
      const trialStartDate = new Date(database[deviceId].trial_start_date);
      const daysPassed = Math.floor((now - trialStartDate) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, TRIAL_DURATION_DAYS - daysPassed);

      // تحديث حالة الفترة التجريبية
      database[deviceId].last_access = now.toISOString();
      database[deviceId].status = remainingDays > 0 ? 'active' : 'expired';

      await writeDatabase(database);

      return res.json({
        status: database[deviceId].status,
        remaining_days: remainingDays,
        trial_start_date: database[deviceId].trial_start_date,
        message: remainingDays > 0 ? 
          `تبقى ${remainingDays} ${remainingDays === 1 ? 'يوم' : 'أيام'} على انتهاء الفترة التجريبية` :
          'انتهت الفترة التجريبية'
      });

    } else {
      // جهاز جديد - إنشاء فترة تجريبية جديدة
      const trialStartDate = now.toISOString();

      database[deviceId] = {
        device_id: deviceId,
        trial_start_date: trialStartDate,
        status: 'active',
        created_at: trialStartDate,
        last_access: trialStartDate
      };

      await writeDatabase(database);

      return res.json({
        status: 'active',
        remaining_days: TRIAL_DURATION_DAYS,
        trial_start_date: trialStartDate,
        message: `مرحباً! لديك ${TRIAL_DURATION_DAYS} أيام فترة تجريبية مجانية`
      });
    }

  } catch (error) {
    console.error('خطأ في التحقق من الفترة التجريبية:', error);
    return res.status(500).json({ 
      error: 'خطأ داخلي في الخادم',
      status: 'error'
    });
  }
});

// نقطة نهاية لإحصائيات الفترة التجريبية (للمطورين)
app.get('/api/trial-stats', async (req, res) => {
  try {
    const database = await readDatabase();
    const devices = Object.values(database);

    const stats = {
      total_devices: devices.length,
      active_trials: devices.filter(d => d.status === 'active').length,
      expired_trials: devices.filter(d => d.status === 'expired').length,
      devices: devices.map(d => ({
        device_id: d.device_id,
        status: d.status,
        trial_start_date: d.trial_start_date,
        last_access: d.last_access
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

// بدء الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 خادم الفترة التجريبية يعمل على المنفذ ${PORT}`);
  console.log(`📊 احصائيات الفترة التجريبية: http://localhost:${PORT}/api/trial-stats`);
});

module.exports = app;
