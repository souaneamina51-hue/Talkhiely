
// معالج الصوت المتخصص للهجة الجزائرية - إصدار محسّن للتسجيلات الطويلة
class AlgerianAudioProcessor {
  constructor() {
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.recognition = null;
    this.maxChunkDuration = 30; // 30 ثانية لكل مقطع لتوازن أفضل
    this.setupRecognition();
    
    // Web Audio API context للتعامل مع الصوت
    this.audioContext = null;
    this.initAudioContext();
    
    // إدارة الذاكرة والموارد
    this.memoryUsage = {
      maxFileSize: 100 * 1024 * 1024, // 100MB حد أقصى
      currentChunks: 0,
      processedChunks: []
    };
    
    // تنظيف الذاكرة كل 5 دقائق
    this.memoryCleanupInterval = setInterval(() => {
      this.cleanupMemory();
    }, 5 * 60 * 1000);
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('✅ تم تهيئة Audio Context بنجاح');
    } catch (error) {
      console.warn('⚠️ فشل في تهيئة Audio Context:', error);
    }
  }

  // تنظيف الذاكرة وإلغاء المراجع
  cleanupMemory() {
    try {
      // تنظيف المقاطع المعالجة
      this.memoryUsage.processedChunks = [];
      this.memoryUsage.currentChunks = 0;
      
      // إجبار garbage collection إذا كان متاحاً
      if (window.gc && typeof window.gc === 'function') {
        window.gc();
      }
      
      console.log('🧹 تم تنظيف الذاكرة');
    } catch (error) {
      console.warn('⚠️ خطأ في تنظيف الذاكرة:', error);
    }
  }

  // تدمير المعالج وتحرير الموارد
  destroy() {
    try {
      if (this.memoryCleanupInterval) {
        clearInterval(this.memoryCleanupInterval);
      }
      
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      this.cleanupMemory();
      console.log('🗑️ تم تدمير معالج الصوت وتحرير الموارد');
    } catch (error) {
      console.warn('⚠️ خطأ في تدمير المعالج:', error);
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

  // معالجة التسجيلات الطويلة - الإصدار المحسن بناءً على pseudo-code
  async processLongAudioWithRealSplitting(audioBlob, duration, onProgress = null) {
    console.log(`🔄 معالجة تسجيل طويل: ${duration.toFixed(1)} ثانية`);

    // فحص حجم الملف قبل المعالجة
    if (audioBlob.size > this.memoryUsage.maxFileSize) {
      throw new Error(`الملف كبير جداً (${Math.round(audioBlob.size / 1024 / 1024)}MB). الحد الأقصى المسموح: ${Math.round(this.memoryUsage.maxFileSize / 1024 / 1024)}MB`);
    }

    try {
      // تقسيم الصوت إلى مقاطع - تطبيق pseudo-code
      const chunks = await this.splitAudioIntoRealChunks(audioBlob, duration);
      console.log(`📦 تم تقسيم التسجيل إلى ${chunks.length} مقطع فعلي`);

      // متغير لتجميع النص النهائي - كما في pseudo-code
      let finalText = "";
      let successfulChunks = 0;
      this.memoryUsage.currentChunks = chunks.length;

      // معالجة كل مقطع - تطبيق الحلقة من pseudo-code
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔄 معالجة المقطع ${i + 1} من ${chunks.length}...`);

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: chunks.length,
            stage: 'processing',
            message: `معالجة المقطع ${i + 1}/${chunks.length} باللهجة الجزائرية...`,
            memoryInfo: `الذاكرة: ${this.getMemoryUsageInfo()}`
          });
        }

        try {
          // تحويل المقطع إلى نص مع التركيز على اللهجة الجزائرية
          const chunkText = await this.processChunkToText(chunk);

          if (chunkText && chunkText.trim().length > 3) {
            // دمج النصوص الجزئية تدريجياً - كما في pseudo-code
            finalText += chunkText.trim() + " ";
            successfulChunks++;
            console.log(`✅ المقطع ${i + 1}: "${chunkText.substring(0, 40)}..."`);
          } else {
            console.warn(`⚠️ المقطع ${i + 1}: لم يُستخرج نص صالح`);
          }

        } catch (chunkError) {
          console.warn(`⚠️ فشل معالجة المقطع ${i + 1}:`, chunkError.message);
          // تجاهل المقطع الفاشل مؤقتاً - كما في pseudo-code
        }

        // تنظيف الذاكرة فوراً بعد كل مقطع - كما في pseudo-code
        chunk.blob = null;
        chunks[i] = null;

        // توقف قصير بين المقاطع لتجنب إرهاق النظام
        await new Promise(resolve => setTimeout(resolve, 1500));

        // تنظيف دوري للذاكرة
        if ((i + 1) % 2 === 0) {
          this.cleanupMemory();
        }
      }

      // تنظيف المصفوفة نهائياً
      chunks.length = 0;

      // التحقق من النص النهائي
      if (!finalText || finalText.trim().length < 15) {
        throw new Error(`فشل في استخراج نص كافي. تم معالجة ${successfulChunks}/${this.memoryUsage.currentChunks} مقطع فقط.`);
      }

      console.log(`✅ النص الكامل جاهز للتلخيص: ${finalText.length} حرف من ${successfulChunks} مقطع`);

      if (onProgress) {
        onProgress({
          current: 85,
          total: 100,
          stage: 'merging',
          message: 'دمج وتنظيف النص النهائي...'
        });
      }

      // تحسين النص النهائي
      const enhancedText = this.finalTextCleanup(finalText.trim());
      
      // تنظيف نهائي للذاكرة
      this.cleanupMemory();
      
      return enhancedText;

    } catch (error) {
      console.error('❌ خطأ في معالجة التسجيل الطويل:', error);
      this.cleanupMemory();
      throw error;
    }
  }

  // دالة لمعالجة كل مقطع وتحويله إلى نص - مطابقة لـ pseudo-code
  async processChunkToText(chunk) {
    try {
      // استخدام التعرف على الكلام المخصص للهجة الجزائرية
      const text = await this.transcribeAudioBlobDirectly(chunk.blob);
      return text;
    } catch (error) {
      console.error("خطأ في معالجة المقطع:", error);
      return ""; // تجاهل المقطع الفاشل مؤقتاً - كما في pseudo-code
    } finally {
      // تنظيف الذاكرة - كما في pseudo-code
      chunk.blob = null;
    }
  }

  // تقسيم الصوت إلى مقاطع حقيقية - تطبيق pseudo-code
  async splitAudioIntoRealChunks(audioBlob, totalDuration) {
    console.log(`🔧 بدء تقسيم الصوت: ${totalDuration.toFixed(1)} ثانية`);
    
    try {
      // تطبيق pseudo-code: حساب عدد المقاطع
      const CHUNK_DURATION = this.maxChunkDuration; // 30 ثانية
      const numChunks = Math.ceil(totalDuration / CHUNK_DURATION);
      
      console.log(`📊 سيتم إنشاء ${numChunks} مقطع بحجم ${CHUNK_DURATION} ثانية لكل مقطع`);

      if (!this.audioContext) {
        console.warn('Web Audio API غير متاح، استخدام تقسيم الـ Blob');
        return this.splitAudioBlobIntoChunks(audioBlob, totalDuration, numChunks);
      }

      // استخدام Web Audio API للتقسيم الدقيق
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      let chunks = []; // كما في pseudo-code
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;

      // تطبيق حلقة pseudo-code: for (let i = 0; i < numChunks; i++)
      for (let i = 0; i < numChunks; i++) {
        const start = i * CHUNK_DURATION;
        const end = Math.min((i + 1) * CHUNK_DURATION, totalDuration);
        
        console.log(`📦 إنشاء المقطع ${i + 1}/${numChunks}: ${start.toFixed(1)}s - ${end.toFixed(1)}s`);
        
        // حساب العينات الصوتية
        const startSample = Math.floor(start * sampleRate);
        const endSample = Math.floor(end * sampleRate);
        const chunkLength = endSample - startSample;

        if (chunkLength <= 0) {
          console.warn(`⚠️ طول المقطع ${i + 1} غير صالح، تجاهل`);
          continue;
        }

        try {
          // إنشاء buffer جديد للمقطع
          const chunkBuffer = this.audioContext.createBuffer(
            numberOfChannels,
            chunkLength,
            sampleRate
          );

          // نسخ البيانات الصوتية للمقطع
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const sourceChannelData = audioBuffer.getChannelData(channel);
            const chunkChannelData = chunkBuffer.getChannelData(channel);
            
            for (let sample = 0; sample < chunkLength; sample++) {
              const sourceIndex = startSample + sample;
              if (sourceIndex < sourceChannelData.length) {
                chunkChannelData[sample] = sourceChannelData[sourceIndex];
              }
            }
          }

          // تحويل Buffer إلى Blob - كما في pseudo-code: audioFile.slice(start, end)
          const chunkBlob = await this.audioBufferToBlob(chunkBuffer);
          
          // إضافة المقطع للمصفوفة - كما في pseudo-code
          chunks.push({
            blob: chunkBlob,
            startTime: start,
            endTime: end,
            index: i,
            duration: end - start,
            size: chunkBlob.size
          });

          console.log(`✅ المقطع ${i + 1}: ${(end - start).toFixed(1)}s، حجم: ${Math.round(chunkBlob.size / 1024)}KB`);

        } catch (chunkError) {
          console.error(`❌ فشل إنشاء المقطع ${i + 1}:`, chunkError);
          continue;
        }

        // توقف قصير لتجنب حمل الذاكرة
        if (i % 3 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ تم إنشاء ${chunks.length}/${numChunks} مقطع بنجاح`);
      return chunks;

    } catch (error) {
      console.error('❌ فشل التقسيم المتقدم:', error);
      // fallback للتقسيم البسيط
      return this.splitAudioBlobIntoChunks(audioBlob, totalDuration, Math.ceil(totalDuration / this.maxChunkDuration));
    }
  }

  // تقسيم بديل باستخدام Blob slicing
  async splitAudioBlobIntoChunks(audioBlob, totalDuration, numChunks) {
    console.log('📂 استخدام تقسيم Blob البديل...');
    
    const chunks = [];
    const bytesPerChunk = Math.floor(audioBlob.size / numChunks);
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * this.maxChunkDuration;
      const end = Math.min((i + 1) * this.maxChunkDuration, totalDuration);
      
      const startByte = i * bytesPerChunk;
      const endByte = (i === numChunks - 1) ? audioBlob.size : (i + 1) * bytesPerChunk;
      
      try {
        const chunkBlob = audioBlob.slice(startByte, endByte, audioBlob.type);
        
        chunks.push({
          blob: chunkBlob,
          startTime: start,
          endTime: end,
          index: i,
          duration: end - start,
          size: chunkBlob.size,
          isSliced: true
        });
        
        console.log(`📦 مقطع بديل ${i + 1}: ${start.toFixed(1)}s - ${end.toFixed(1)}s`);
        
      } catch (sliceError) {
        console.error(`❌ فشل تقطيع المقطع ${i + 1}:`, sliceError);
      }
    }
    
    return chunks;
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

  // تقسيم محسّن للذاكرة
  async splitAudioIntoMemoryEfficientChunks(audioBlob, duration) {
    console.log('🧠 بدء التقسيم المحسّن للذاكرة...');
    
    try {
      // محاولة استخدام Web Audio API للتقسيم الفعلي
      if (this.audioContext && audioBlob.size < 50 * 1024 * 1024) { // للملفات أقل من 50MB
        return await this.splitAudioIntoRealChunks(audioBlob, duration);
      } else {
        // للملفات الكبيرة، استخدم التقسيم المحسّن
        return await this.splitLargeAudioBlob(audioBlob, duration);
      }
    } catch (error) {
      console.warn('فشل في التقسيم المتقدم، استخدام البديل:', error);
      return this.splitAudioAlternative(audioBlob, duration);
    }
  }

  // تقسيم الملفات الكبيرة باستخدام Blob slicing
  async splitLargeAudioBlob(audioBlob, duration) {
    console.log('📂 تقسيم ملف صوتي كبير...');
    
    const chunks = [];
    const numberOfChunks = Math.ceil(duration / this.maxChunkDuration);
    const bytesPerSecond = audioBlob.size / duration;
    
    for (let i = 0; i < numberOfChunks; i++) {
      const startTime = i * this.maxChunkDuration;
      const endTime = Math.min((i + 1) * this.maxChunkDuration, duration);
      const chunkDuration = endTime - startTime;
      
      // حساب موقع البايتات
      const startByte = Math.floor(startTime * bytesPerSecond);
      const endByte = Math.floor(endTime * bytesPerSecond);
      
      try {
        // تقطيع الملف على مستوى البايتات
        const chunkBlob = audioBlob.slice(startByte, endByte, audioBlob.type);
        
        chunks.push({
          blob: chunkBlob,
          startTime: startTime,
          endTime: endTime,
          index: i,
          size: chunkBlob.size,
          isSliced: true
        });
        
        console.log(`📦 مقطع ${i + 1}: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s (${Math.round(chunkBlob.size / 1024)}KB)`);
        
        // توقف قصير لتجنب حمل الذاكرة
        if (i % 5 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (sliceError) {
        console.warn(`⚠️ فشل في تقطيع المقطع ${i + 1}:`, sliceError);
        
        // fallback للمقطع الفاشل
        chunks.push({
          blob: audioBlob,
          startTime: startTime,
          endTime: endTime,
          index: i,
          isSimulated: true
        });
      }
    }
    
    console.log(`✅ تم تقسيم الملف إلى ${chunks.length} مقطع بحجم إجمالي ${Math.round(audioBlob.size / 1024 / 1024)}MB`);
    return chunks;
  }

  // معلومات استخدام الذاكرة
  getMemoryUsageInfo() {
    try {
      if (performance && performance.memory) {
        const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
        const limit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        return `${used}/${total}MB (حد: ${limit}MB)`;
      }
    } catch (error) {
      console.warn('لا يمكن الحصول على معلومات الذاكرة:', error);
    }
    return 'غير متاح';
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

  // تحويل ملف الصوت إلى نص مع إعادة المحاولة وإدارة الذاكرة
  async transcribeAudioBlobWithRetry(audioBlob, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 محاولة التحويل ${attempt}/${maxRetries} (حجم: ${Math.round(audioBlob.size / 1024)}KB)`);
        
        // فحص حجم المقطع
        if (audioBlob.size > 10 * 1024 * 1024) { // 10MB
          console.warn('⚠️ مقطع كبير، قد يستغرق وقتاً أطول...');
        }
        
        const result = await this.transcribeAudioBlob(audioBlob);
        
        if (result && result.length > 5 && !this.isFallbackText(result)) {
          console.log(`✅ نجح التحويل في المحاولة ${attempt}: ${result.length} حرف`);
          return result;
        } else {
          throw new Error(`نتيجة غير صالحة (طول: ${result ? result.length : 0}) أو نص احتياطي`);
        }
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ فشلت المحاولة ${attempt}/${maxRetries}:`, error.message);
        
        if (attempt === maxRetries) {
          console.error('❌ فشل في جميع المحاولات');
          throw lastError;
        }
        
        // انتظار متزايد بين المحاولات
        const waitTime = attempt * 2000; // 2s, 4s, 6s...
        console.log(`⏱️ انتظار ${waitTime/1000} ثانية قبل المحاولة التالية...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // تنظيف سريع للذاكرة بين المحاولات
        if (attempt < maxRetries) {
          await new Promise(resolve => {
            setTimeout(() => {
              this.cleanupMemory();
              resolve();
            }, 500);
          });
        }
      }
    }
    
    throw lastError || new Error('فشل في جميع محاولات التحويل');
  }

  // تحويل مباشر للصوت إلى نص بدون نص احتياطي
  async transcribeAudioBlobDirectly(audioBlob) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
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
          // التعرف متوقف بالفعل
        }

        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
          if (audioElement.src && audioElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioElement.src);
          }
        }
      };

      try {
        // إعداد خاص للهجة الجزائرية والعربية
        this.recognition.continuous = true;
        this.recognition.interimResults = false; // نتائج نهائية فقط
        this.recognition.maxAlternatives = 1;
        
        // التركيز على اللغة العربية للجزائر
        this.recognition.lang = 'ar-SA'; // أفضل دعم للعربية

        // مهلة زمنية أقصر للمقاطع
        let timeout = setTimeout(() => {
          cleanup();

          if (finalTranscript.trim().length > 5) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error('لم يتم استخراج نص من هذا المقطع'));
          }
        }, 25000); // 25 ثانية لكل مقطع

        this.recognition.onstart = () => {
          console.log('🎤 بدأ تحويل المقطع...');
          recognitionStarted = true;
        };

        this.recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            
            if (result.isFinal) {
              const transcript = result[0].transcript.trim();
              if (transcript && transcript.length > 2) {
                finalTranscript += transcript + ' ';
                console.log('📝 نص المقطع:', transcript);
              }
            }
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('⚠️ خطأ في تحويل المقطع:', event.error);
          clearTimeout(timeout);
          cleanup();

          // حتى لو كان هناك خطأ، جرب إرجاع ما تم استخراجه
          if (finalTranscript.trim().length > 5) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error(`فشل تحويل المقطع: ${event.error}`));
          }
        };

        this.recognition.onend = () => {
          console.log('✅ انتهى تحويل المقطع');
          clearTimeout(timeout);
          cleanup();

          const result = finalTranscript.trim();
          if (result && result.length > 3) {
            resolve(result);
          } else {
            reject(new Error('لم يتم استخراج نص كافي من هذا المقطع'));
          }
        };

        // تشغيل الصوت للتعرف عليه
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement = new Audio(audioUrl);
        
        audioElement.volume = 1.0; // أقصى مستوى صوت للوضوح
        audioElement.preload = 'auto';

        audioElement.oncanplay = () => {
          // بدء التعرف
          this.recognition.start();
          
          // تأخير قصير ثم تشغيل الصوت
          setTimeout(() => {
            audioElement.play().catch(playError => {
              console.warn('تحذير تشغيل الصوت:', playError);
            });
          }, 800);
        };

        audioElement.onerror = (error) => {
          console.error('❌ خطأ تحميل الصوت:', error);
          clearTimeout(timeout);
          cleanup();
          reject(new Error('فشل في تحميل الملف الصوتي'));
        };

        // تحميل الصوت
        audioElement.load();

      } catch (error) {
        console.error('❌ خطأ إعداد التعرف:', error);
        cleanup();
        reject(error);
      }
    });
  }

  // الدالة الأصلية محتفظ بها للاستخدام العام
  async transcribeAudioBlob(audioBlob) {
    return this.transcribeAudioBlobDirectly(audioBlob);
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
