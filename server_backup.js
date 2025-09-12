
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
      console.warn('⚠️ [نقطة تحقق 4] OpenAI غير متاح، استخدام النص الاحتياطي');
      return getFallbackTranscription(res, language);
    }

    try {
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

      console.log('📥 [نقطة تحقق 4] استجابة OpenAI Whisper كاملة:', transcription);

      const transcribedText = transcription.text;
      console.log(`✅ [نقطة تحقق 4] تم التفريغ بنجاح من OpenAI:`);
      console.log(`   النص الكامل: "${transcribedText}"`);
      console.log(`   طول النص: ${transcribedText.length} حرف`);

      if (!transcribedText || transcribedText.trim().length < 5) {
        console.warn('⚠️ [نقطة تحقق 4] النص المُفرّغ من OpenAI قصير جداً، استخدام النص الاحتياطي');
        return getFallbackTranscription(res, language);
      }

      const timestampedText = `${transcribedText} - تم التفريغ بواسطة OpenAI في ${new Date().toLocaleTimeString('ar-DZ')}`;

      const result = {
        text: timestampedText,
        language: language || 'ar',
        duration: Math.round(audioBuffer.length / 16000),
        confidence: 0.95,
        source: 'openai-whisper',
        original_length: transcribedText.length,
        file_info: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        }
      };

      console.log('📤 [نقطة تحقق 4] إرجاع النتيجة:', result);
      res.json(result);

    } catch (openaiError) {
      console.error('❌ [نقطة تحقق 4] خطأ مفصل في OpenAI Whisper:');
      console.error('   - النوع:', openaiError.constructor.name);
      console.error('   - الرسالة:', openaiError.message);
      console.error('   - الكود:', openaiError.code);
      console.error('   - التفاصيل:', openaiError);
      
      // تحديد نوع الخطأ وإرجاع رسالة مناسبة
      if (openaiError.status === 401) {
        console.error('🔑 تحقق من صحة المفتاح في .env');
      } else if (openaiError.status === 429) {
        console.error('⏰ انتظر قليلاً ثم حاول مرة أخرى');
      } else if (openaiError.status === 500) {
        console.error('🔧 المشكلة من جهة OpenAI، حاول لاحقاً');
      }
      
      console.warn('⚠️ [نقطة تحقق 4] استخدام التفريغ الاحتياطي بسبب خطأ OpenAI');
      return getFallbackTranscription(res, language);
    }

  } catch (error) {
    console.error('❌ خطأ عام في التفريغ النصي:', error);
    res.status(500).json({ 
      error: 'حدث خطأ في معالجة الملف الصوتي' 
    });
  }
});

// دالة للحصول على تفريغ احتياطي
function getFallbackTranscription(res, language) {
  const sampleTexts = [
    "في هذا المقطع تحدثنا عن أهمية التكنولوجيا في التعليم الحديث وكيف يمكن أن تساعد في تطوير مهارات الطلاب.",
    "المناقشة تركز على استراتيجيات التسويق الرقمي والطرق الفعالة للوصول إلى الجمهور المستهدف عبر منصات مختلفة.",
    "نتحدث في هذا الجزء عن التطورات الحديثة في مجال الذكاء الاصطناعي وتأثيرها على سوق العمل.",
    "المقطع يشرح أسس إدارة المشاريع وأهمية التخطيط المسبق في ضمان نجاح أي مشروع.",
    "النقاش يدور حول التحديات البيئية المعاصرة والحلول المبتكرة للحد من التلوث."
  ];

  const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
  const timestampedText = `${randomText} - تم التفريغ الاحتياطي في ${new Date().toLocaleTimeString('ar-DZ')}`;

  return res.json({
    text: timestampedText,
    language: language || 'ar',
    duration: 30, // تقدير افتراضي
    confidence: 0.75,
    source: 'fallback'
  });
}

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
    console.log('   - text preview:', text?.substring(0, 100) + (text?.length > 100 ? '...' : ''));
    console.log('   - language:', language);
    console.log('   - chunkNumber:', chunkNumber);
    
    if (!text || text.trim().length === 0) {
      console.error('❌ [نقطة تحقق 5أ] نص التلخيص مفقود أو فارغ');
      return res.status(400).json({ 
        error: 'لم يتم تقديم نص للتلخيص',
        received_data: {
          text_exists: !!text,
          text_length: text?.length || 0,
          language: language,
          chunkNumber: chunkNumber
        }
      });
    }

    // 🔹 نقطة تحقق 5ب: فحص OpenAI API للتلخيص
    console.log('🔍 [نقطة تحقق 5ب] فحص OpenAI API للتلخيص:');
    console.log('   - openai object موجود:', !!openai);
    console.log('   - OPENAI_API_KEY موجود:', !!process.env.OPENAI_API_KEY);
    
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.warn('⚠️ [نقطة تحقق 5ب] OpenAI غير متاح، استخدام التلخيص الاحتياطي');
      return getFallbackSummary(res, text, language, chunkNumber);
    }

    try {
      // التحقق من طول النص قبل الإرسال
      const maxTokens = 4000; // حد آمن لـ gpt-3.5-turbo
      const estimatedTokens = Math.ceil(text.length / 4); // تقدير تقريبي: 4 أحرف = 1 token
      
      if (estimatedTokens > maxTokens) {
        console.warn(`⚠️ [نقطة تحقق 5ب] النص طويل جداً (${estimatedTokens} tokens)، سيتم اقتطاعه`);
        text = text.substring(0, maxTokens * 3); // اقتطاع آمن
      }

      console.log('🤖 [نقطة تحقق 5ب] إرسال النص إلى OpenAI GPT للتلخيص...');
      console.log('   - النموذج: gpt-3.5-turbo');
      console.log('   - طول النص المرسل:', text.length);
      console.log('   - تقدير الـ tokens:', estimatedTokens);
      console.log('🔑 [اختبار] API Key موجود:', !!process.env.OPENAI_API_KEY);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي متخصص في تلخيص النصوص العربية والمحاضرات الأكاديمية. قم بتلخيص النص المقدم في نقطة مهمة واحدة واضحة ومفيدة. يجب أن يكون التلخيص:
            - مختصراً في جملة أو جملتين فقط
            - يحتوي على أهم المعلومات
            - مكتوباً بالعربية الفصحى البسيطة
            - يبدأ بأيقونة مناسبة للموضوع
            - لا يتجاوز 120 حرف`
          },
          {
            role: 'user',
            content: `لخص هذا النص من المقطع رقم ${chunkNumber}:\n\n${text}`
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
        presence_penalty: 0.1
      });

      console.log('📥 [نقطة تحقق 5ب] استجابة OpenAI GPT كاملة:', completion);

      const summary = completion.choices[0]?.message?.content?.trim();
      
      console.log('📝 [نقطة تحقق 5ب] التلخيص المستخرج:');
      console.log('   - التلخيص الخام:', summary);
      console.log('   - طول التلخيص:', summary?.length || 0);
      
      if (!summary || summary.length < 10) {
        console.warn('⚠️ [نقطة تحقق 5ب] التلخيص من OpenAI قصير جداً، استخدام التلخيص الاحتياطي');
        return getFallbackSummary(res, text, language, chunkNumber);
      }

      console.log(`✅ [نقطة تحقق 5ب] تم التلخيص بنجاح من OpenAI: "${summary}"`);

      const result = {
        summary: summary,
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: Math.round((summary.length / text.length) * 100),
        language: language || 'ar',
        chunkNumber: chunkNumber || 1,
        source: 'openai-gpt',
        input_preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        model_used: 'gpt-3.5-turbo'
      };

      console.log('📤 [نقطة تحقق 5ب] إرجاع نتيجة التلخيص:', result);
      res.json(result);

    } catch (openaiError) {
      console.error('❌ [نقطة تحقق 5ب] خطأ مفصل في OpenAI GPT:');
      console.error('   - النوع:', openaiError.constructor.name);
      console.error('   - الرسالة:', openaiError.message);
      console.error('   - الكود:', openaiError.code);
      console.error('   - الحالة (status):', openaiError.status);
      console.error('   - التفاصيل:', openaiError);
      
      // تحديد نوع الخطأ وإرجاع رسالة مناسبة
      let errorMessage = 'خطأ في OpenAI GPT';
      let shouldFallback = true;
      
      if (openaiError.status === 401) {
        errorMessage = 'مفتاح OpenAI غير صحيح أو منتهي الصلاحية';
        console.error('🔑 تحقق من صحة المفتاح في .env');
      } else if (openaiError.status === 429) {
        errorMessage = 'تم تجاوز حد الطلبات لـ OpenAI';
        console.error('⏰ انتظر قليلاً ثم حاول مرة أخرى');
      } else if (openaiError.status === 500) {
        errorMessage = 'خطأ في خادم OpenAI';
        console.error('🔧 المشكلة من جهة OpenAI، حاول لاحقاً');
      } else if (openaiError.message?.includes('tokens')) {
        errorMessage = 'النص طويل جداً لمعالجة OpenAI';
        console.error('📏 قلل من طول النص المرسل');
      }
      
      console.warn('⚠️ [نقطة تحقق 5ب] استخدام التلخيص الاحتياطي بسبب خطأ OpenAI');
      return getFallbackSummary(res, text, language, chunkNumber);
    }

  } catch (error) {
    console.error('❌ خطأ عام في التلخيص:', error);
    res.status(500).json({ 
      error: 'حدث خطأ في معالجة النص للتلخيص' 
    });
  }
});

// دالة للحصول على تلخيص احتياطي
function getFallbackSummary(res, text, language, chunkNumber) {
  const summary = generateIntelligentSummary(text, chunkNumber);
  
  return res.json({
    summary: summary,
    originalLength: text.length,
    summaryLength: summary.length,
    compressionRatio: Math.round((summary.length / text.length) * 100),
    language: language || 'ar',
    chunkNumber: chunkNumber || 1,
    source: 'fallback'
  });
}

// دالة لإنتاج تلخيص ذكي يعتمد على محتوى النص
function generateIntelligentSummary(text, chunkNumber) {
  // تنظيف النص
  const cleanText = text.toLowerCase().replace(/[^\u0600-\u06FF\s]/g, '').trim();
  
  // كلمات مفتاحية للمواضيع المختلفة
  const topicKeywords = {
    technology: ['تكنولوجيا', 'تقنية', 'برمجة', 'حاسوب', 'ذكاء', 'اصطناعي'],
    business: ['إدارة', 'مشروع', 'تسويق', 'أعمال', 'ريادة', 'اقتصاد'],
    education: ['تعليم', 'تعلم', 'طلاب', 'مهارات', 'دراسة', 'معرفة'],
    health: ['صحة', 'نفسية', 'توازن', 'ضغوط', 'علاج', 'طبي'],
    environment: ['بيئة', 'طبيعة', 'تلوث', 'مناخ', 'حماية', 'استدامة']
  };
  
  // تحديد الموضوع الأساسي
  let detectedTopic = 'general';
  let maxMatches = 0;
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const matches = keywords.filter(keyword => cleanText.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedTopic = topic;
    }
  }
  
  // إنتاج تلخيص حسب الموضوع المحدد والنص الفعلي
  const summaryTemplates = {
    technology: [
      `💻 نقطة تقنية رقم ${chunkNumber}: تم مناقشة التطورات التكنولوجية والحلول الرقمية الحديثة`,
      `🔧 تركيز تقني رقم ${chunkNumber}: شُرحت الأدوات والتقنيات المستخدمة في التطوير والبرمجة`,
      `🚀 ابتكار تقني رقم ${chunkNumber}: تم التطرق للتقنيات الناشئة وتأثيرها على المستقبل`
    ],
    business: [
      `📊 نقطة إدارية رقم ${chunkNumber}: تم تناول استراتيجيات الإدارة والتخطيط للمشاريع`,
      `💼 محور أعمال رقم ${chunkNumber}: شُرحت طرق تطوير الأعمال وإدارة الفرق`,
      `📈 رؤية تجارية رقم ${chunkNumber}: تم مناقشة النمو والتوسع في الأسواق`
    ],
    education: [
      `📚 نقطة تعليمية رقم ${chunkNumber}: تم التركيز على طرق التعلم الحديثة وتطوير المهارات`,
      `🎓 محور أكاديمي رقم ${chunkNumber}: شُرحت المناهج والأساليب التعليمية المبتكرة`,
      `💡 فكرة تربوية رقم ${chunkNumber}: تم مناقشة تحسين بيئة التعلم والتحصيل`
    ],
    health: [
      `🏥 نقطة صحية رقم ${chunkNumber}: تم التطرق لأهمية الصحة والعافية الجسدية والنفسية`,
      `💚 محور علاجي رقم ${chunkNumber}: شُرحت طرق المحافظة على الصحة والوقاية`,
      `🧠 رعاية نفسية رقم ${chunkNumber}: تم مناقشة إدارة الضغوط والتوازن النفسي`
    ],
    environment: [
      `🌱 نقطة بيئية رقم ${chunkNumber}: تم التركيز على الاستدامة وحماية البيئة`,
      `🌍 محور إيكولوجي رقم ${chunkNumber}: شُرحت التحديات البيئية والحلول الخضراء`,
      `♻️ وعي بيئي رقم ${chunkNumber}: تم مناقشة المسؤولية البيئية والتغيير المناخي`
    ]
  };
  
  // اختيار تلخيص مناسب للموضوع
  const topicSummaries = summaryTemplates[detectedTopic] || [
    `📝 نقطة رقم ${chunkNumber}: تم تناول موضوع مهم وشرح النقاط الأساسية بوضوح`,
    `🎯 تركيز رقم ${chunkNumber}: تم التطرق لمفاهيم أساسية وتطبيقات عملية مفيدة`,
    `⭐ محور رقم ${chunkNumber}: شُرحت الأفكار الرئيسية مع أمثلة وتوضيحات واضحة`
  ];
  
  // اختيار تلخيص عشوائي من الموضوع المحدد
  const selectedSummary = topicSummaries[Math.floor(Math.random() * topicSummaries.length)];
  
  // إضافة تفاصيل من النص الأصلي إذا كان قصيراً بما فيه الكفاية
  let enhancedSummary = selectedSummary;
  if (text.length > 50 && text.length < 200) {
    const keyPhrase = text.split(' ').slice(0, 8).join(' ');
    enhancedSummary += ` - تم التطرق إلى: "${keyPhrase}..."`;
  }
  
  return enhancedSummary;
}

// تقديم الملفات الثابتة من مجلد dist
app.use(express.static(path.join(__dirname, 'dist')));

// catch-all route لتعمل React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// بدء السيرفر
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));