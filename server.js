
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// تحميل متغيرات البيئة
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// 🔹 نقطة تحقق 1: طباعة متغيرات البيئة
console.log('🔍 [نقطة تحقق 1] فحص متغيرات البيئة:');
console.log('   - OPENAI_API_KEY موجود:', !!process.env.OPENAI_API_KEY);
console.log('   - OPENAI_API_KEY يبدأ بـ sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-'));
console.log('   - طول المفتاح:', process.env.OPENAI_API_KEY?.length || 0);
console.log('   - PORT:', PORT);

// إعداد OpenAI مع معالجة الأخطاء
let openai = null;
try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ [نقطة تحقق 1] OpenAI API Key: موجود وجاهز للاستخدام');
    
    // اختبار الاتصال مع OpenAI
    openai.models.list()
      .then(res => console.log("🚀 [اختبار الاتصال] OpenAI متصل بنجاح:", res.data[0]?.id || 'متاح'))
      .catch(err => console.error("❌ [اختبار الاتصال] فشل الاتصال مع OpenAI:", err.message));
  } else {
    console.warn('⚠️ [نقطة تحقق 1] مفتاح OpenAI غير موجود أو غير صحيح - سيتم استخدام النص الاحتياطي');
    console.log('   المفتاح الحالي:', process.env.OPENAI_API_KEY ? 'موجود لكن غير صحيح' : 'غير موجود');
  }
} catch (error) {
  console.error('❌ [نقطة تحقق 1] خطأ في إعداد OpenAI:', error.message);
  openai = null;
}

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

// 🔹 نقطة تحقق 2: API للتحقق من الفترة التجريبية
app.post('/api/check-trial', (req, res) => {
  try {
    console.log('📋 [نقطة تحقق 2] طلب فحص الفترة التجريبية:');
    console.log('   - Body:', req.body);
    console.log('   - Headers:', req.headers);
    
    const { deviceId } = req.body;
    
    // التحقق من البيانات المرسلة
    if (!deviceId) {
      console.warn('⚠️ [نقطة تحقق 2] deviceId مفقود');
      return res.status(400).json({ 
        valid: false, 
        error: 'deviceId مطلوب',
        status: 'error' 
      });
    }
    
    // محاكاة منطق الفترة التجريبية
    const trialData = {
      status: 'active',
      remaining_days: 7,
      valid: true,
      deviceId: deviceId,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ [نقطة تحقق 2] إرجاع بيانات الفترة التجريبية:', trialData);
    res.json(trialData);
    
  } catch (error) {
    console.error('❌ [نقطة تحقق 2] خطأ في فحص الفترة التجريبية:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'خطأ في الخادم: ' + error.message,
      status: 'error' 
    });
  }
});

// مسار API لفحص حالة النظام
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    openai_available: !!openai && !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// 🔹 نقطة تحقق 3: API للتفريغ النصي للمقاطع الصوتية باستخدام OpenAI Whisper
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('🔤 [نقطة تحقق 3] بدء معالجة طلب التفريغ:');
    console.log('   - req.file موجود:', !!req.file);
    console.log('   - req.body:', req.body);
    
    const { language } = req.body;
    const audioBuffer = req.file?.buffer;
    
    // 🔹 نقطة تحقق 3أ: فحص الملف المرفوع
    if (!req.file) {
      console.error('❌ [نقطة تحقق 3أ] req.file غير موجود');
      return res.status(400).json({ 
        error: 'لم يتم رفع أي ملف',
        received_fields: Object.keys(req.body),
        file_info: null
      });
    }
    
    if (!audioBuffer) {
      console.error('❌ [نقطة تحقق 3أ] audioBuffer غير موجود رغم وجود req.file');
      return res.status(400).json({ 
        error: 'الملف المرفوع لا يحتوي على بيانات',
        file_info: {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        }
      });
    }

    console.log(`✅ [نقطة تحقق 3أ] ملف صوتي صالح:`);
    console.log(`   - الاسم: ${req.file.originalname}`);
    console.log(`   - النوع: ${req.file.mimetype}`);
    console.log(`   - الحجم: ${Math.round(audioBuffer.length / 1024)} KB`);
    console.log(`   - اللغة المطلوبة: ${language || 'ar (افتراضي)'}`);

    // 🔹 نقطة تحقق 3ب: فحص صيغة الملف
    const supportedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/x-m4a'];
    if (!supportedTypes.includes(req.file.mimetype)) {
      console.warn(`⚠️ [نقطة تحقق 3ب] نوع ملف غير مدعوم: ${req.file.mimetype}`);
      console.log(`   الأنواع المدعومة: ${supportedTypes.join(', ')}`);
    }

    // 🔹 نقطة تحقق 4: فحص OpenAI API
    console.log('🔍 [نقطة تحقق 4] فحص OpenAI API:');
    console.log('   - openai object موجود:', !!openai);
    console.log('   - OPENAI_API_KEY موجود:', !!process.env.OPENAI_API_KEY);
    
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.error('❌ [نقطة تحقق 4] OpenAI API Key مفقود أو غير صحيح');
      return res.status(500).json({ 
        error: 'Missing or invalid OpenAI API Key. Please check your environment variables.',
        code: 'MISSING_API_KEY'
      });
    }

    // إنشاء ملف من البيانات
    const file = new File([audioBuffer], req.file.originalname || 'audio.webm', { 
      type: req.file.mimetype || 'audio/webm' 
    });
    
    console.log('🤖 [نقطة تحقق 4] إرسال الصوت إلى OpenAI Whisper...');
    console.log('   - اسم الملف:', file.name);
    console.log('   - نوع الملف:', file.type);
    console.log('   - حجم الملف:', Math.round(file.size / 1024), 'KB');
    
    // تفريغ الصوت باستخدام OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language === 'ar-DZ' ? 'ar' : language || 'ar',
      response_format: 'json',
      temperature: 0.1
    });

    console.log('📥 [نقطة تحقق 4] استجابة OpenAI Whisper:', transcription);

    const transcribedText = transcription.text;
    console.log(`✅ [نقطة تحقق 4] تم التفريغ بنجاح من OpenAI:`);
    console.log(`   النص: "${transcribedText}"`);

    const result = {
      text: transcribedText,
      language: transcription.language || language || 'ar',
      duration: transcription.duration || Math.round(audioBuffer.length / 16000),
      confidence: 0.95,
      source: 'openai-whisper',
      file_info: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      }
    };

    console.log('📤 [نقطة تحقق 4] إرجاع النتيجة:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ خطأ في التفريغ النصي:', error);
    res.status(500).json({ 
      error: error.message || 'حدث خطأ في معالجة الملف الصوتي',
      code: error.code || 'TRANSCRIPTION_ERROR'
    });
  }
});



// 🔹 نقطة تحقق 5: API للتلخيص النصي باستخدام OpenAI GPT
app.post('/api/summarize', async (req, res) => {
  try {
    console.log('📝 [نقطة تحقق 5] بدء معالجة طلب التلخيص:');
    console.log('   - req.body:', req.body);
    
    const { text, language, chunkNumber } = req.body;
    
    // 🔹 نقطة تحقق 5أ: فحص النص المرسل
    console.log('🔍 [نقطة تحقق 5أ] فحص النص المرسل:');
    console.log('   - text موجود:', !!text);
    console.log('   - text طول:', text?.length || 0);
    console.log('   - language:', language);
    console.log('   - chunkNumber:', chunkNumber);
    
    if (!text || text.trim().length === 0) {
      console.error('❌ [نقطة تحقق 5أ] نص التلخيص مفقود أو فارغ');
      return res.status(400).json({ 
        error: 'لم يتم تقديم نص للتلخيص',
        code: 'MISSING_TEXT'
      });
    }

    // 🔹 نقطة تحقق 5ب: فحص OpenAI API للتلخيص
    console.log('🔍 [نقطة تحقق 5ب] فحص OpenAI API للتلخيص:');
    console.log('   - openai object موجود:', !!openai);
    console.log('   - OPENAI_API_KEY موجود:', !!process.env.OPENAI_API_KEY);
    
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.error('❌ [نقطة تحقق 5ب] OpenAI API Key مفقود أو غير صحيح');
      return res.status(500).json({ 
        error: 'Missing or invalid OpenAI API Key. Please check your environment variables.',
        code: 'MISSING_API_KEY'
      });
    }

    // التحقق من طول النص قبل الإرسال
    let processedText = text;
    const maxTokens = 4000;
    const estimatedTokens = Math.ceil(text.length / 4);
    
    if (estimatedTokens > maxTokens) {
      console.warn(`⚠️ [نقطة تحقق 5ب] النص طويل جداً (${estimatedTokens} tokens)، سيتم اقتطاعه`);
      processedText = text.substring(0, maxTokens * 3);
    }

    console.log('🤖 [نقطة تحقق 5ب] إرسال النص إلى OpenAI GPT للتلخيص...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `أنت مساعد ذكي متخصص في تلخيص النصوص العربية. قم بتلخيص النص المقدم في نقطة مهمة واضحة ومفيدة. التلخيص يجب أن يكون:
          - مختصراً في جملة أو جملتين
          - يحتوي على أهم المعلومات
          - مكتوباً بالعربية الفصحى البسيطة
          - يبدأ بأيقونة مناسبة للموضوع`
        },
        {
          role: 'user',
          content: processedText
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    
    console.log('✅ [نقطة تحقق 5ب] تم التلخيص بنجاح من OpenAI');

    const result = {
      summary: summary,
      originalLength: text.length,
      summaryLength: summary.length,
      compressionRatio: Math.round((summary.length / text.length) * 100),
      language: language || 'ar',
      chunkNumber: chunkNumber || 1,
      source: 'openai-gpt'
    };

    console.log('📤 [نقطة تحقق 5ب] إرجاع نتيجة التلخيص:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ خطأ في التلخيص:', error);
    res.status(500).json({ 
      error: error.message || 'حدث خطأ في معالجة النص للتلخيص',
      code: error.code || 'SUMMARIZATION_ERROR'
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));