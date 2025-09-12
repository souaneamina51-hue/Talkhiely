
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import { spawn } from 'child_process';

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

// إعداد multer لحفظ الملفات مؤقتاً للـ local Whisper
const uploadLocal = multer({
  dest: "uploads/",
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

// 🔹 نقطة تحقق 3: API للتفريغ النصي للمقاطع الصوتية باستخدام Whisper المحلي
app.post('/api/transcribe', uploadLocal.single('file'), (req, res) => {
  try {
    console.log('🔤 [Whisper المحلي] بدء معالجة طلب التفريغ:');
    console.log('   - req.file موجود:', !!req.file);
    console.log('   - req.body:', req.body);
    
    if (!req.file) {
      console.error('❌ [Whisper المحلي] req.file غير موجود');
      return res.status(400).json({ 
        error: 'لم يتم رفع أي ملف',
        code: 'NO_FILE'
      });
    }

    const filePath = req.file.path;
    console.log('📁 [Whisper المحلي] مسار الملف:', filePath);

    // استدعاء سكربت Python وتشغيل Whisper محلي
    const py = spawn("python3", ["transcribe.py", filePath]);
    
    let result = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => {
      result += data.toString();
    });

    py.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("❌ [Whisper المحلي] خطأ:", data.toString());
    });

    py.on("close", (code) => {
      // تنظيف الملف بعد الاستخدام
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ [Whisper المحلي] فشل في حذف الملف المؤقت:', cleanupError.message);
      }

      if (code !== 0) {
        console.error(`❌ [Whisper المحلي] فشل السكربت برمز: ${code}`);
        console.error('   رسالة الخطأ:', errorOutput);
        
        return res.status(500).json({ 
          error: 'فشل في تفريغ الملف الصوتي باستخدام Whisper المحلي',
          details: errorOutput,
          code: 'LOCAL_WHISPER_ERROR'
        });
      }

      const transcribedText = result.trim();
      console.log('✅ [Whisper المحلي] تم التفريغ بنجاح:', transcribedText);

      const response = {
        text: transcribedText,
        source: 'local-whisper',
        file_info: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        }
      };

      res.json(response);
    });

  } catch (error) {
    console.error('❌ [Whisper المحلي] خطأ في التفريغ:', error);
    res.status(500).json({ 
      error: error.message || 'حدث خطأ في معالجة الملف الصوتي',
      code: 'LOCAL_TRANSCRIPTION_ERROR'
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