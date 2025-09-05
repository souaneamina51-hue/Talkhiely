
// معالج الصوت المتخصص للهجة الجزائرية - إصدار محسّن للتسجيلات الطويلة
class AlgerianAudioProcessor {
  constructor() {
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.recognition = null;
    this.maxChunkDuration = 25; // 25 ثانية لكل مقطع
    this.setupRecognition();
    
    // Web Audio API context للتعامل مع الصوت
    this.audioContext = null;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('✅ تم تهيئة Audio Context بنجاح');
    } catch (error) {
      console.warn('⚠️ فشل في تهيئة Audio Context:', error);
    }
  }

  setupRecognition() {
    if (!this.isSupported) {
      console.warn('متصفحك لا يدعم التعرف على الكلام');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // إعدادات محسّنة للتعرف على العربية والجزائرية
    this.recognition.lang = 'ar-SA'; // العربية السعودية لدعم أفضل
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    console.log('🔧 تم إعداد التعرف على الكلام للهجة الجزائرية');
  }

  // معالجة الصوت الفعلية باستخدام التعرف الحقيقي على الكلام
  async processAudioBlob(audioBlob, onProgress = null) {
    console.log('🎤 بدء معالجة الصوت باللهجة الجزائرية...');

    try {
      // التحقق من صحة الملف
      if (!audioBlob || audioBlob.size < 1000) {
        throw new Error('ملف صوتي غير صالح أو صغير جداً');
      }

      console.log('📊 حجم الملف:', Math.round(audioBlob.size / 1024), 'KB');
      console.log('📊 نوع الملف:', audioBlob.type);

      if (onProgress) {
        onProgress({
          current: 10,
          total: 100,
          stage: 'preparing',
          message: 'تحضير التعرف على الكلام باللهجة الجزائرية...'
        });
      }

      // الحصول على مدة الصوت الحقيقية
      const audioDuration = await this.getAccurateAudioDuration(audioBlob);
      console.log('⏱️ مدة التسجيل الحقيقية:', audioDuration.toFixed(1), 'ثانية');

      let extractedText = '';

      if (audioDuration > this.maxChunkDuration) {
        console.log('📋 تسجيل طويل، تقسيم إلى مقاطع...');
        extractedText = await this.processLongAudioWithRealSplitting(audioBlob, audioDuration, onProgress);
      } else {
        console.log('📋 تسجيل قصير، معالجة مباشرة...');
        if (onProgress) {
          onProgress({
            current: 50,
            total: 100,
            stage: 'processing',
            message: 'التعرف على الكلام من التسجيل الصوتي...'
          });
        }
        extractedText = await this.transcribeAudioBlobWithRetry(audioBlob);
      }

      // التحقق من جودة النص المستخرج
      if (!extractedText || extractedText.length < 10) {
        console.warn('⚠️ النص المستخرج قصير أو فارغ');
        throw new Error('فشل في استخراج نص كافي من التسجيل الصوتي');
      }

      // التحقق من أن النص ليس احتياطي
      if (this.isFallbackText(extractedText)) {
        throw new Error('فشل في التعرف على الكلام الفعلي من التسجيل');
      }

      // تحسين النص الجزائري
      const enhancedText = this.enhanceAlgerianText(extractedText);

      console.log('✅ تم استخراج النص بنجاح:', enhancedText.substring(0, 50) + '...');
      return enhancedText;

    } catch (error) {
      console.error('❌ خطأ في معالجة الصوت:', error);
      throw error; // رفع الخطأ بدلاً من استخدام النص الاحتياطي
    }
  }

  // الحصول على مدة الصوت الدقيقة باستخدام Web Audio API
  async getAccurateAudioDuration(audioBlob) {
    try {
      if (this.audioContext) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer.duration;
      }
    } catch (error) {
      console.warn('فشل Web Audio API، استخدام HTML Audio:', error);
    }

    // fallback لـ HTML Audio
    return new Promise((resolve) => {
      try {
        const audio = new Audio(URL.createObjectURL(audioBlob));

        const handleLoadedMetadata = () => {
          const duration = audio.duration || 0;
          if (duration === Infinity || isNaN(duration)) {
            console.warn('مدة غير صالحة، استخدام قيمة تقديرية');
            resolve(30); // قيمة افتراضية آمنة
          } else {
            resolve(duration);
          }
          cleanup();
        };

        const handleError = () => {
          console.warn('فشل في تحديد مدة الصوت');
          resolve(30); // قيمة افتراضية
          cleanup();
        };

        const cleanup = () => {
          URL.revokeObjectURL(audio.src);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('error', handleError);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);

        // timeout للحماية من التعليق
        setTimeout(() => {
          if (audio.duration) {
            handleLoadedMetadata();
          } else {
            handleError();
          }
        }, 5000);

      } catch (error) {
        console.warn('خطأ في إنشاء عنصر الصوت:', error);
        resolve(30);
      }
    });
  }

  // معالجة التسجيلات الطويلة مع التقسيم الفعلي
  async processLongAudioWithRealSplitting(audioBlob, duration, onProgress = null) {
    console.log(`🔄 معالجة تسجيل طويل: ${duration.toFixed(1)} ثانية`);

    try {
      // تقسيم الصوت إلى مقاطع فعلية
      const chunks = await this.splitAudioIntoRealChunks(audioBlob, duration);
      console.log(`📦 تم تقسيم التسجيل إلى ${chunks.length} مقطع فعلي`);

      const results = [];
      let successfulChunks = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`⚙️ معالجة المقطع ${i + 1}/${chunks.length} (${chunk.startTime.toFixed(1)}s - ${chunk.endTime.toFixed(1)}s)...`);

        if (onProgress) {
          const progress = Math.round(30 + (i / chunks.length) * 50);
          onProgress({
            current: i + 1,
            total: chunks.length,
            stage: 'processing',
            message: `معالجة المقطع ${i + 1}/${chunks.length} باللهجة الجزائرية...`
          });
        }

        try {
          const chunkText = await this.transcribeAudioBlobWithRetry(chunk.blob);

          if (chunkText && chunkText.length > 5 && !this.isFallbackText(chunkText)) {
            results.push({
              index: i,
              text: chunkText,
              startTime: chunk.startTime,
              endTime: chunk.endTime
            });
            successfulChunks++;
            console.log(`✅ المقطع ${i + 1}: "${chunkText.substring(0, 30)}..."`);
          } else {
            console.warn(`⚠️ المقطع ${i + 1}: نص غير صالح أو احتياطي`);
          }
        } catch (chunkError) {
          console.error(`❌ فشل معالجة المقطع ${i + 1}:`, chunkError);
        }

        // توقف بين المقاطع للسماح للمتصفح بالاستراحة
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      if (results.length === 0) {
        throw new Error('فشل في معالجة جميع مقاطع التسجيل. لم يتم الحصول على أي نص صالح.');
      }

      console.log(`🎯 تم معالجة ${results.length}/${chunks.length} مقطع بنجاح (${Math.round(successfulChunks/chunks.length*100)}%)`);

      if (onProgress) {
        onProgress({
          current: 85,
          total: 100,
          stage: 'merging',
          message: 'دمج وتنظيف النصوص...'
        });
      }

      return this.mergeChunkTexts(results);

    } catch (error) {
      console.error('❌ خطأ في معالجة التسجيل الطويل:', error);
      throw error;
    }
  }

  // تقسيم الصوت إلى مقاطع فعلية باستخدام Web Audio API
  async splitAudioIntoRealChunks(audioBlob, duration) {
    try {
      if (!this.audioContext) {
        console.warn('Web Audio API غير متاح، استخدام التقسيم البديل');
        return this.splitAudioAlternative(audioBlob, duration);
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const chunks = [];
      const chunkDuration = this.maxChunkDuration;
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;

      for (let start = 0; start < duration; start += chunkDuration) {
        const startTime = start;
        const endTime = Math.min(start + chunkDuration, duration);
        
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);
        const chunkLength = endSample - startSample;

        // إنشاء buffer جديد للمقطع
        const chunkBuffer = this.audioContext.createBuffer(
          numberOfChannels,
          chunkLength,
          sampleRate
        );

        // نسخ البيانات الصوتية
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);
          const chunkChannelData = chunkBuffer.getChannelData(channel);
          
          for (let i = 0; i < chunkLength; i++) {
            chunkChannelData[i] = channelData[startSample + i];
          }
        }

        // تحويل Buffer إلى Blob
        const chunkBlob = await this.audioBufferToBlob(chunkBuffer);
        
        chunks.push({
          blob: chunkBlob,
          startTime: startTime,
          endTime: endTime,
          index: chunks.length
        });

        console.log(`📦 مقطع ${chunks.length}: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`);
      }

      return chunks;

    } catch (error) {
      console.warn('فشل في التقسيم المتقدم، استخدام البديل:', error);
      return this.splitAudioAlternative(audioBlob, duration);
    }
  }

  // طريقة بديلة للتقسيم (محاكاة بسيطة)
  splitAudioAlternative(audioBlob, duration) {
    const chunks = [];
    const numberOfChunks = Math.ceil(duration / this.maxChunkDuration);

    for (let i = 0; i < numberOfChunks; i++) {
      const startTime = i * this.maxChunkDuration;
      const endTime = Math.min((i + 1) * this.maxChunkDuration, duration);

      // في الطريقة البديلة، نستخدم نفس الملف مع تسجيل أوقات مختلفة
      // في تطبيق حقيقي، نحتاج لتقطيع الصوت فعلياً
      chunks.push({
        blob: audioBlob,
        startTime: startTime,
        endTime: endTime,
        index: i,
        isSimulated: true // علامة للإشارة أن هذا تقسيم محاكي
      });
    }

    console.log(`📦 تم إنشاء ${chunks.length} مقطع محاكي`);
    return chunks;
  }

  // تحويل AudioBuffer إلى Blob
  async audioBufferToBlob(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // إنشاء WAV header
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // تحويل ملف الصوت إلى نص مع إعادة المحاولة
  async transcribeAudioBlobWithRetry(audioBlob, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 محاولة التحويل ${attempt}/${maxRetries}`);
        const result = await this.transcribeAudioBlob(audioBlob);
        
        if (result && result.length > 10 && !this.isFallbackText(result)) {
          return result;
        } else {
          throw new Error('نتيجة غير صالحة أو نص احتياطي');
        }
      } catch (error) {
        console.warn(`⚠️ فشلت المحاولة ${attempt}:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // انتظار قبل المحاولة التالية
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // تحويل ملف الصوت إلى نص باستخدام تشغيل الصوت والتعرف عليه
  async transcribeAudioBlob(audioBlob) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        console.error('❌ التعرف على الكلام غير مدعوم');
        return reject(new Error('متصفحك لا يدعم التعرف على الكلام'));
      }

      let finalTranscript = '';
      let recognitionStarted = false;
      let audioElement = null;
      let cleanupDone = false;

      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;

        try {
          if (this.recognition && recognitionStarted) {
            this.recognition.stop();
          }
        } catch (e) {
          console.log('التعرف متوقف بالفعل');
        }

        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
          if (audioElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioElement.src);
          }
        }
      };

      try {
        // إعداد التعرف على الكلام مع اللغات المختلفة
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        // تجربة لغات مختلفة للحصول على أفضل نتيجة
        const languages = ['ar-SA', 'ar-EG', 'ar-MA', 'ar'];
        this.recognition.lang = languages[0];

        let timeout = setTimeout(() => {
          console.log('⏰ انتهت مهلة التعرف');
          cleanup();

          if (finalTranscript.trim().length > 10) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error('انتهت مهلة التعرف على الكلام دون الحصول على نتائج كافية'));
          }
        }, 35000); // 35 ثانية

        this.recognition.onstart = () => {
          console.log('✅ بدأ التعرف على الكلام');
          recognitionStarted = true;
        };

        this.recognition.onresult = (event) => {
          console.log('📝 استلام نتائج التعرف...');

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence;

            console.log(`نتيجة: "${transcript}" (ثقة: ${(confidence || 0).toFixed(2)})`);

            if (result.isFinal) {
              finalTranscript += transcript + ' ';
              console.log('✅ نص نهائي:', transcript);
            }
          }
        };

        this.recognition.onerror = (event) => {
          console.error('❌ خطأ في التعرف:', event.error);
          clearTimeout(timeout);
          cleanup();

          if (finalTranscript.trim().length > 10) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error(`خطأ في التعرف على الكلام: ${event.error}`));
          }
        };

        this.recognition.onend = () => {
          console.log('🔚 انتهى التعرف على الكلام');
          clearTimeout(timeout);
          cleanup();

          const result = finalTranscript.trim();
          if (result && result.length > 10) {
            console.log('✅ النص النهائي:', result);
            resolve(result);
          } else {
            console.log('❌ لم يتم الحصول على نص كافي');
            reject(new Error('لم يتم استخراج نص كافي من التسجيل الصوتي'));
          }
        };

        // إنشاء عنصر الصوت وتشغيله
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement = new Audio(audioUrl);

        // تشغيل الصوت مع مستوى صوت مناسب للتعرف
        audioElement.volume = 0.8;
        audioElement.preload = 'auto';

        audioElement.onloadeddata = () => {
          console.log('🔊 تم تحميل الصوت، بدء التعرف...');

          // بدء التعرف أولاً
          this.recognition.start();

          // ثم تشغيل الصوت بعد تأخير قصير
          setTimeout(() => {
            audioElement.play().catch(error => {
              console.warn('تحذير: فشل تشغيل الصوت:', error);
              // لا نتوقف هنا، قد يعمل التعرف من الميكروفون
            });
          }, 1000);
        };

        audioElement.onerror = (error) => {
          console.error('❌ خطأ في تشغيل الصوت:', error);
          clearTimeout(timeout);
          cleanup();
          reject(new Error('فشل في تشغيل الملف الصوتي للتعرف عليه'));
        };

        // تحميل الصوت
        audioElement.load();

      } catch (error) {
        console.error('❌ خطأ في إعداد التعرف:', error);
        cleanup();
        reject(error);
      }
    });
  }

  // دمج نصوص المقاطع
  mergeChunkTexts(results) {
    console.log('🔗 بدء دمج النصوص...');

    const sortedResults = results.sort((a, b) => a.index - b.index);
    let combinedText = sortedResults
      .map(result => result.text.trim())
      .filter(text => text && text.length > 0)
      .join(' ');

    // تنظيف النص المدمج
    combinedText = this.finalTextCleanup(combinedText);

    console.log(`✨ النص المدمج: ${combinedText.length} حرف من ${sortedResults.length} مقطع`);
    return combinedText;
  }

  // تنظيف النص النهائي
  finalTextCleanup(text) {
    let cleaned = text;

    // إزالة المسافات المتعددة
    cleaned = cleaned.replace(/\s+/g, ' ');

    // تصحيح علامات الترقيم
    cleaned = cleaned.replace(/\s+([.!؟،])/g, '$1');

    // إزالة التكرار المباشر للكلمات
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');

    // إضافة نقطة في النهاية
    if (cleaned && !['.', '!', '؟'].includes(cleaned.slice(-1))) {
      cleaned += '.';
    }

    return cleaned.trim();
  }

  // التحقق من النص الاحتياطي
  isFallbackText(text) {
    const fallbackIndicators = [
      'كان عندنا محاضرة مهمة اليوم على التكنولوجيا',
      'هذا نص تجريبي',
      'واش راك اليوم؟ كان عندنا محاضرة مليح برك',
      'النص يتحدث عن موضوع مهم',
      'الموضوع يطرح نقاط مفيدة'
    ];
    
    return fallbackIndicators.some(indicator => 
      text.includes(indicator)
    );
  }

  // تحسين النص الجزائري
  enhanceAlgerianText(text) {
    const algerianToStandard = {
      // التحيات والتعبيرات الشائعة
      'واش راك': 'كيف حالك',
      'واش رايح': 'كيف حالك',
      'كيفاش حالك': 'كيف حالك',
      'كيفاش راك': 'كيف حالك',

      // الاتجاهات والحركة
      'وين راح': 'إلى أين ذهب',
      'وين رايح': 'إلى أين تذهب',
      'غادي نروح': 'سأذهب',

      // الاستفهام
      'علاش هكذا': 'لماذا هكذا',
      'واش هذا': 'ما هذا',
      'واش هاذي': 'ما هذه',
      'وقتاش': 'متى',

      // الصفات والأحوال
      'مليح برك': 'جيد فقط',
      'مليح بزاف': 'جيد جداً',
      'باهي شوي': 'جيد قليلاً',
      'ماشي مليح': 'ليس جيداً',
      'برشة حاجات': 'أشياء كثيرة',
      'برشة ناس': 'أشخاص كثيرون',

      // التأكيد والنفي
      'إيوه صحيح': 'نعم صحيح',
      'ايه والله': 'نعم والله',
      'لا خلاص': 'لا انتهى الأمر',
      'ماشي هكذا': 'ليس هكذا',
      'ما نقدرش': 'لا أستطيع',

      // الأفعال المهمة
      'نديروا': 'نفعل',
      'نشوفوا': 'نرى',
      'نسمعوا': 'نسمع',
      'ندوروا': 'نبحث',
      'نخدموا': 'نعمل',
      'نقولوا': 'نقول',
    };

    let enhancedText = text;

    // تطبيق التصحيحات
    Object.keys(algerianToStandard).forEach(algerian => {
      const standard = algerianToStandard[algerian];
      const regex = new RegExp(`\\b${algerian.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      enhancedText = enhancedText.replace(regex, standard);
    });

    return enhancedText;
  }
}

export default AlgerianAudioProcessor;
