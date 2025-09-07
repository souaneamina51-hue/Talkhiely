
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// إعداد CORS
app.use(cors());

// تحسين الإعدادات للتسجيلات الكبيرة
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// إعداد multer لرفع الملفات الصوتية
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// مسار API للتحقق من الفترة التجريبية
app.post('/api/check-trial', (req, res) => {
  const { deviceId } = req.body;

  // هنا يمكن استبدال البيانات الثابتة بمنطق حقيقي مع قاعدة بيانات
  res.json({ status: 'active', remaining_days: 7 });
});

// مسار API للتفريغ النصي للمقاطع الصوتية
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const { language } = req.body;
    const audioBuffer = req.file?.buffer;
    
    if (!audioBuffer) {
      return res.status(400).json({ 
        error: 'لم يتم العثور على ملف صوتي' 
      });
    }

    console.log(`🔤 تفريغ نصي لمقطع بحجم ${Math.round(audioBuffer.length / 1024)} KB`);

    // محاكاة معالجة التفريغ النصي
    // في التطبيق الحقيقي، ستتم معالجة الصوت باستخدام خدمة تفريغ نصي
    await new Promise(resolve => setTimeout(resolve, 2000)); // محاكاة وقت المعالجة

    // نص تجريبي متنوع للاختبار
    const sampleTexts = [
      "في هذا المقطع تحدثنا عن أهمية التكنولوجيا في التعليم الحديث وكيف يمكن أن تساعد في تطوير مهارات الطلاب.",
      "المناقشة تركز على استراتيجيات التسويق الرقمي والطرق الفعالة للوصول إلى الجمهور المستهدف عبر منصات مختلفة.",
      "نتحدث في هذا الجزء عن التطورات الحديثة في مجال الذكاء الاصطناعي وتأثيرها على سوق العمل.",
      "المقطع يشرح أسس إدارة المشاريع وأهمية التخطيط المسبق في ضمان نجاح أي مشروع.",
      "النقاش يدور حول التحديات البيئية المعاصرة والحلول المبتكرة للحد من التلوث.",
      "في هذا الجزء نتطرق إلى أهمية الصحة النفسية وطرق المحافظة على التوازن في الحياة اليومية.",
      "المحتوى يركز على مبادئ ريادة الأعمال والخصائص المطلوبة في رجال الأعمال الناجحين."
    ];

    const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    const timestampedText = `${randomText} - تم التفريغ في ${new Date().toLocaleTimeString('ar-DZ')}`;

    res.json({
      text: timestampedText,
      language: language || 'ar',
      duration: Math.round(audioBuffer.length / 16000), // تقدير تقريبي للمدة
      confidence: 0.85 + Math.random() * 0.1 // ثقة وهمية
    });

  } catch (error) {
    console.error('❌ خطأ في التفريغ النصي:', error);
    res.status(500).json({ 
      error: 'حدث خطأ في معالجة الملف الصوتي' 
    });
  }
});

// مسار API للتلخيص النصي
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, language, chunkNumber } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'لم يتم تقديم نص للتلخيص' 
      });
    }

    console.log(`📝 تلخيص نص بطول ${text.length} حرف - مقطع ${chunkNumber}`);

    // محاكاة وقت معالجة التلخيص
    await new Promise(resolve => setTimeout(resolve, 1500));

    // تلخيص ذكي يعتمد على رقم المقطع
    const summaryTemplates = [
      `📍 النقطة الأساسية: تم التركيز على الجوانب التقنية والعملية للموضوع مع شرح مفصل للمفاهيم المهمة.`,
      `🔑 النقطة المحورية: تم تناول الاستراتيجيات والطرق المختلفة لتحقيق الأهداف المطلوبة بكفاءة عالية.`,
      `💡 الفكرة الرئيسية: تم شرح التطبيقات العملية والفوائد المباشرة مع أمثلة واضحة ومفيدة.`,
      `⭐ النقطة المهمة: تم التطرق إلى التحديات والصعوبات وكيفية التعامل معها بطرق إبداعية.`,
      `🎯 التركيز الأساسي: تم عرض الحلول المبتكرة والطرق الحديثة لمواجهة المشاكل المعاصرة.`,
      `🔍 النقطة التحليلية: تم تفصيل الأسباب والنتائج مع تحليل شامل للظروف المحيطة.`,
      `🚀 النقطة التطويرية: تم تناول طرق التحسين والتطوير المستقبلي مع رؤية واضحة للأهداف.`
    ];

    // اختيار تلخيص بناءً على رقم المقطع أو عشوائي
    let summary;
    if (chunkNumber && chunkNumber <= summaryTemplates.length) {
      summary = summaryTemplates[chunkNumber - 1];
    } else {
      summary = summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)];
    }

    // إضافة معلومات السياق
    const contextualSummary = `${summary} (مقطع ${chunkNumber || 'غير محدد'})`;

    res.json({
      summary: contextualSummary,
      originalLength: text.length,
      summaryLength: contextualSummary.length,
      compressionRatio: Math.round((contextualSummary.length / text.length) * 100),
      language: language || 'ar',
      chunkNumber: chunkNumber || 1
    });

  } catch (error) {
    console.error('❌ خطأ في التلخيص:', error);
    res.status(500).json({ 
      error: 'حدث خطأ في معالجة النص للتلخيص' 
    });
  }
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
