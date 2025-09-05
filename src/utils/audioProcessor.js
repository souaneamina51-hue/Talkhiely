
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

  // الحصول على مدة الصوت الموثوقة باستخدام الطريقة المحسنة
  async getAccurateAudioDuration(audioBlob) {
    console.log(`🔍 [حساب المدة] بدء حساب مدة التسجيل، حجم الملف: ${Math.round(audioBlob.size / 1024)}KB`);
    
    // الطريقة الموثوقة الأولى: HTML Audio مع loadedmetadata (حسب التوصيات)
    console.log(`🎵 [HTML Audio] استخدام الطريقة الموثوقة للحصول على المدة`);
    
    return new Promise((resolve) => {
      let resolved = false;
      
      const safeResolve = (duration, method) => {
        if (resolved) return;
        resolved = true;
        console.log(`✅ [${method}] مدة محددة: ${duration.toFixed(2)} ثانية`);
        resolve(duration);
      };

      try {
        const audio = new Audio();
        const audioUrl = URL.createObjectURL(audioBlob);
        audio.src = audioUrl;
        
        // تعيين خصائص مهمة للحصول على مدة دقيقة
        audio.preload = 'metadata';
        audio.volume = 0;
        
        console.log(`📥 [تحميل الصوت] بدء تحميل البيانات الوصفية`);
        
        const cleanup = () => {
          try {
            if (audio.src && audio.src.startsWith('blob:')) {
              URL.revokeObjectURL(audio.src);
            }
            audio.src = '';
          } catch (e) {
            console.warn(`⚠️ [تنظيف] خطأ في التنظيف:`, e.message);
          }
        };

        // المستمع الرئيسي للحصول على مدة دقيقة
        audio.addEventListener('loadedmetadata', () => {
          console.log(`📊 [loadedmetadata] تم تحميل البيانات الوصفية`);
          console.log(`🔍 [فحص المدة] duration: ${audio.duration}, readyState: ${audio.readyState}`);
          
          // التحقق من صحة المدة
          if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration) && audio.duration > 0) {
            console.log(`🎯 [مدة صحيحة] المدة: ${audio.duration.toFixed(2)} ثانية`);
            cleanup();
            safeResolve(audio.duration, 'HTML Audio - loadedmetadata');
          } else {
            console.warn(`⚠️ [مدة غير صالحة] duration: ${audio.duration}`);
            // محاولة الانتظار قليلاً في حالة التحميل البطيء
            setTimeout(() => {
              if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration) && audio.duration > 0) {
                cleanup();
                safeResolve(audio.duration, 'HTML Audio - تأخير');
              } else {
                console.warn(`⚠️ [فشل نهائي HTML Audio] استخدام التقدير الذكي`);
                cleanup();
                const estimatedDuration = this.calculateReliableDuration(audioBlob);
                safeResolve(estimatedDuration, 'تقدير ذكي');
              }
            }, 1000);
          }
        });

        // معالج الأخطاء
        audio.addEventListener('error', (error) => {
          console.error(`❌ [HTML Audio Error]`, error);
          cleanup();
          const fallbackDuration = this.calculateReliableDuration(audioBlob);
          safeResolve(fallbackDuration, 'خطأ - تقدير احتياطي');
        });

        // حماية من التعليق
        setTimeout(() => {
          if (!resolved) {
            console.warn(`⏰ [انتهاء المهلة] انتهت مهلة 6 ثواني، استخدام التقدير`);
            cleanup();
            const fallbackDuration = this.calculateReliableDuration(audioBlob);
            safeResolve(fallbackDuration, 'انتهاء المهلة - تقدير احتياطي');
          }
        }, 6000);

        // بدء تحميل البيانات الوصفية
        audio.load();

      } catch (error) {
        console.error(`💥 [استثناء HTML Audio]`, error);
        const fallbackDuration = this.calculateReliableDuration(audioBlob);
        safeResolve(fallbackDuration, 'استثناء - تقدير احتياطي');
      }
    });
  }

  // حساب مدة موثوقة بناءً على خصائص الملف (طريقة محسنة)
  calculateReliableDuration(audioBlob) {
    console.log(`🧮 [تقدير موثوق] تحليل خصائص الملف للتقدير`);
    
    const sizeInMB = audioBlob.size / (1024 * 1024);
    const fileType = audioBlob.type.toLowerCase();
    
    console.log(`📊 [خصائص] حجم: ${sizeInMB.toFixed(2)}MB، نوع: ${fileType}`);
    
    // معدلات تقديرية محسنة حسب نوع الملف
    let estimatedMinutes = 0;
    
    if (fileType.includes('wav')) {
      // WAV غير مضغوط: حوالي 10MB لكل دقيقة بجودة عادية
      estimatedMinutes = sizeInMB / 10;
    } else if (fileType.includes('mp3')) {
      // MP3 بمعدل 128kbps: حوالي 1MB لكل دقيقة
      estimatedMinutes = sizeInMB / 1;
    } else if (fileType.includes('m4a') || fileType.includes('aac')) {
      // AAC مضغوط: حوالي 1.2MB لكل دقيقة
      estimatedMinutes = sizeInMB / 1.2;
    } else if (fileType.includes('webm')) {
      // WebM من المتصفح: عادة مضغوط جيداً
      estimatedMinutes = sizeInMB / 0.8;
    } else {
      // تقدير عام محافظ
      estimatedMinutes = sizeInMB / 2;
    }
    
    const estimatedSeconds = estimatedMinutes * 60;
    
    // تطبيق حدود منطقية
    const finalDuration = Math.max(5, Math.min(estimatedSeconds, 3600)); // بين 5 ثواني و ساعة
    
    console.log(`🎯 [تقدير نهائي] ${finalDuration.toFixed(1)} ثانية (${(finalDuration/60).toFixed(1)} دقيقة)`);
    return finalDuration;
  }

  // تقدير المدة بناءً على خصائص الملف
  estimateDurationFromFileProperties(audioBlob) {
    console.log(`🧮 [تقدير ذكي] تحليل خصائص الملف`);
    
    const sizeInMB = audioBlob.size / (1024 * 1024);
    const fileType = audioBlob.type.toLowerCase();
    
    console.log(`📊 [خصائص الملف] حجم: ${sizeInMB.toFixed(2)}MB، نوع: ${fileType}`);
    
    // معدلات تقديرية حسب نوع الملف (بالثواني لكل ميجابايت)
    let secondsPerMB = 60; // افتراضي
    
    if (fileType.includes('mp3')) {
      secondsPerMB = 480; // MP3 عادة 128kbps
    } else if (fileType.includes('wav')) {
      secondsPerMB = 60; // WAV غير مضغوط
    } else if (fileType.includes('m4a') || fileType.includes('aac')) {
      secondsPerMB = 400; // AAC مضغوط
    } else if (fileType.includes('ogg')) {
      secondsPerMB = 300; // OGG مضغوط متوسط
    } else if (fileType.includes('webm')) {
      secondsPerMB = 250; // WebM مضغوط
    }
    
    const estimatedDuration = sizeInMB * secondsPerMB;
    
    // فحص معقولية التقدير (بين 1 ثانية و 10 ساعات)
    if (estimatedDuration >= 1 && estimatedDuration <= 36000) {
      console.log(`✅ [تقدير معقول] ${estimatedDuration.toFixed(1)} ثانية (${(estimatedDuration/60).toFixed(1)} دقيقة)`);
      return estimatedDuration;
    }
    
    console.warn(`⚠️ [تقدير غير معقول] ${estimatedDuration.toFixed(1)} ثانية`);
    return 0; // إرجاع 0 للمحاولة التالية
  }

  // حساب مدة احتياطية آمنة
  calculateFallbackDuration(audioBlob) {
    const sizeInKB = audioBlob.size / 1024;
    
    // تقدير محافظ: كل 100KB تقريباً = 10 ثواني للجودة المتوسطة
    let estimatedDuration = (sizeInKB / 100) * 10;
    
    // حدود آمنة: بين 10 ثواني و 20 دقيقة
    estimatedDuration = Math.max(10, Math.min(estimatedDuration, 1200));
    
    console.log(`🛡️ [تقدير احتياطي آمن] ${estimatedDuration.toFixed(1)} ثانية للملف ${sizeInKB.toFixed(0)}KB`);
    return estimatedDuration;
  }

  // معالجة التسجيلات الطويلة مع تطبيق التوصيات المحدثة
  async processLongAudioWithRealSplitting(audioBlob, duration, onProgress = null) {
    console.log(`🚀 [بدء معالجة تسجيل طويل] المدة: ${duration.toFixed(1)} ثانية، الحجم: ${Math.round(audioBlob.size / 1024)}KB`);

    // فحص صحة المدة مع التوصيات الجديدة
    if (!duration || duration === Infinity || isNaN(duration) || duration <= 0) {
      console.error(`❌ [مدة غير صالحة] المدة غير صالحة: ${duration}`);
      throw new Error(`مدة التسجيل غير صالحة: ${duration}. استخدم الطريقة الموثوقة للحصول على المدة.`);
    }

    // حدود محسنة للمدة: 15 دقيقة (900 ثانية)
    const MAX_DURATION = 900;
    if (duration > MAX_DURATION) {
      const errorMsg = `التسجيل طويل جداً (${(duration/60).toFixed(1)} دقيقة). الحد الأقصى المسموح: ${MAX_DURATION/60} دقيقة`;
      console.error(`❌ [تسجيل طويل جداً] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // تطبيق التوصيات: مقاطع 20-30 ثانية
    const OPTIMAL_CHUNK_DURATION = duration <= 60 ? 20 : (duration <= 300 ? 25 : 30);
    console.log(`⚙️ [إعدادات التقسيم] مدة المقطع المثلى: ${OPTIMAL_CHUNK_DURATION} ثانية`);

    const estimatedChunks = Math.ceil(duration / OPTIMAL_CHUNK_DURATION);
    const MAX_CHUNKS = 30; // مخفض لتحسين الأداء
    
    if (estimatedChunks > MAX_CHUNKS) {
      const errorMsg = `عدد المقاطع كثير (${estimatedChunks}). الحد الأقصى: ${MAX_CHUNKS}`;
      console.error(`❌ [مقاطع كثيرة] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`✅ [فحص اجتاز] مدة صحيحة: ${duration.toFixed(1)}s، عدد المقاطع المتوقع: ${estimatedChunks}`);

    try {
      // الخطوة 1: تقسيم التسجيل قبل المعالجة (حسب التوصيات)
      console.log(`\n📋 [الخطوة 1/4] تقسيم التسجيل إلى مقاطع ${OPTIMAL_CHUNK_DURATION}s`);
      if (onProgress) {
        onProgress({
          current: 10,
          total: 100,
          stage: 'splitting',
          message: `تقسيم التسجيل إلى ${estimatedChunks} مقطع...`
        });
      }

      const chunks = await this.createOptimalChunks(audioBlob, duration, OPTIMAL_CHUNK_DURATION);
      console.log(`✅ [تم التقسيم] أُنشأ ${chunks.length} مقطع فعلي`);

      // الخطوة 2: معالجة المقاطع بالتتابع (تجنب حفظ التسجيل الكامل في الذاكرة)
      console.log(`\n🔄 [الخطوة 2/4] معالجة المقاطع بالتتابع`);
      let finalText = "";
      let successfulChunks = 0;
      let failedChunks = 0;

      // معالجة متسلسلة مع رسائل console لكل خطوة
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNumber = i + 1;

        console.log(`\n🎤 [بدء المقطع ${chunkNumber}/${chunks.length}]`, {
          مدة: `${chunk.duration?.toFixed(1)}s`,
          حجم: `${Math.round((chunk.blob?.size || 0) / 1024)}KB`,
          وقت_البداية: `${chunk.startTime?.toFixed(1)}s`,
          وقت_النهاية: `${chunk.endTime?.toFixed(1)}s`
        });

        try {
          // معالجة المقطع مع حد زمني
          const chunkStartTime = Date.now();
          const chunkText = await this.processChunkWithTimeout(chunk, chunkNumber, 25000); // 25 ثانية لكل مقطع
          const processingTime = ((Date.now() - chunkStartTime) / 1000).toFixed(1);

          if (chunkText && chunkText.trim().length > 2) {
            finalText += chunkText.trim() + " ";
            successfulChunks++;
            console.log(`✅ [نجح المقطع ${chunkNumber}] "${chunkText.substring(0, 60)}..." (${chunkText.length} حرف في ${processingTime}s)`);
          } else {
            failedChunks++;
            console.warn(`⚠️ [المقطع ${chunkNumber} فارغ] لا يحتوي على نص كافي (${processingTime}s)`);
          }

        } catch (chunkError) {
          failedChunks++;
          console.error(`❌ [فشل المقطع ${chunkNumber}] ${chunkError.message}`);
        } finally {
          // تحرير المقطع من الذاكرة فوراً (حسب التوصيات)
          if (chunk.blob) {
            chunk.blob = null;
            console.log(`🧹 [تنظيف المقطع ${chunkNumber}] تم حذف المقطع من الذاكرة`);
          }
          chunks[i] = null;
        }

        // تحديث التقدم
        if (onProgress) {
          const progress = 20 + ((i + 1) / chunks.length) * 60; // 20% إلى 80%
          onProgress({
            current: Math.round(progress),
            total: 100,
            stage: 'processing',
            message: `معالجة المقاطع (${chunkNumber}/${chunks.length}) - نجح: ${successfulChunks}، فشل: ${failedChunks}`
          });
        }

        // توقف قصير كل 3 مقاطع لتجنب إرهاق النظام
        if (chunkNumber % 3 === 0 && chunkNumber < chunks.length) {
          console.log(`⏸️ [استراحة] توقف قصير بعد ${chunkNumber} مقاطع`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // تنظيف مصفوفة المقاطع نهائياً
      chunks.length = 0;

      // الخطوة 3: فحص النتائج
      console.log(`\n📊 [الخطوة 3/4] فحص النتائج النهائية`);
      console.log(`   ✅ مقاطع ناجحة: ${successfulChunks}`);
      console.log(`   ❌ مقاطع فاشلة: ${failedChunks}`);
      console.log(`   📄 طول النص الخام: ${finalText.length} حرف`);
      console.log(`   🎯 معدل النجاح: ${((successfulChunks / estimatedChunks) * 100).toFixed(1)}%`);

      if (!finalText || finalText.trim().length < 20) {
        const errorMsg = `فشل في استخراج نص كافي. نجح ${successfulChunks}/${estimatedChunks} مقطع فقط`;
        console.error(`❌ [فشل نهائي] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // الخطوة 4: دمج النصوص النهائية (حسب التوصيات)
      console.log(`\n🔗 [الخطوة 4/4] دمج النصوص النهائية`);
      if (onProgress) {
        onProgress({
          current: 85,
          total: 100,
          stage: 'merging',
          message: 'دمج وتنظيف النصوص النهائية...'
        });
      }

      const cleanedText = this.finalTextCleanup(finalText.trim());
      console.log(`✨ [دمج مكتمل] النص النهائي: ${cleanedText.length} حرف`);
      console.log(`📝 [عينة النص] "${cleanedText.substring(0, 100)}..."`);
      
      // تنظيف نهائي للذاكرة
      this.cleanupMemory();
      
      return cleanedText;

    } catch (error) {
      console.error(`💥 [خطأ في معالجة التسجيل الطويل]`, {
        خطأ: error.message,
        المدة: duration,
        حجم_الملف: audioBlob.size
      });
      this.cleanupMemory();
      throw error;
    }
  }

  // إنشاء مقاطع محسنة حسب التوصيات
  async createOptimalChunks(audioBlob, totalDuration, chunkDuration) {
    console.log(`📦 [إنشاء مقاطع] مدة كل مقطع: ${chunkDuration}s من إجمالي ${totalDuration.toFixed(1)}s`);
    
    const numberOfChunks = Math.ceil(totalDuration / chunkDuration);
    const chunks = [];
    const bytesPerSecond = audioBlob.size / totalDuration;
    
    console.log(`📊 [معاملات التقسيم] ${numberOfChunks} مقطع، ${Math.round(bytesPerSecond)} بايت/ثانية`);

    for (let i = 0; i < numberOfChunks; i++) {
      const startTime = i * chunkDuration;
      const endTime = Math.min((i + 1) * chunkDuration, totalDuration);
      const actualDuration = endTime - startTime;
      
      try {
        // حساب موقع البايتات بدقة
        const startByte = Math.floor(startTime * bytesPerSecond);
        const endByte = Math.min(Math.floor(endTime * bytesPerSecond), audioBlob.size);
        
        // تقطيع الملف
        const chunkBlob = audioBlob.slice(startByte, endByte, audioBlob.type);
        
        if (chunkBlob && chunkBlob.size > 500) { // حد أدنى للحجم
          chunks.push({
            blob: chunkBlob,
            startTime: startTime,
            endTime: endTime,
            duration: actualDuration,
            index: i,
            size: chunkBlob.size
          });
          
          console.log(`📦 [مقطع ${i + 1}] ${startTime.toFixed(1)}s-${endTime.toFixed(1)}s (${Math.round(chunkBlob.size/1024)}KB)`);
        } else {
          console.warn(`⚠️ [مقطع ${i + 1} مرفوض] حجم صغير: ${chunkBlob ? chunkBlob.size : 0} بايت`);
        }
        
      } catch (sliceError) {
        console.error(`❌ [خطأ تقطيع المقطع ${i + 1}] ${sliceError.message}`);
      }
    }
    
    console.log(`✅ [إنشاء المقاطع مكتمل] ${chunks.length} مقطع صالح من ${numberOfChunks} محاولة`);
    return chunks;
  }

  // معالجة مقطع مع حد زمني
  async processChunkWithTimeout(chunk, chunkNumber, timeoutMs = 25000) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`انتهت المهلة للمقطع ${chunkNumber} (${timeoutMs/1000}s)`));
      }, timeoutMs);
    });

    const transcriptionPromise = this.transcribeAudioBlobDirectly(chunk.blob);
    
    return Promise.race([transcriptionPromise, timeoutPromise]);
  }

  // دالة معالجة المقاطع مع سجلات تفصيلية وفقاً للتوصيات العاجلة
  async processChunkWithDetailedLogging(chunk, chunkIndex, totalChunks) {
    const startTime = Date.now();
    console.log(`\n🎤 [بدء معالجة المقطع ${chunkIndex}/${totalChunks}]`, {
      chunkSize: chunk.blob ? Math.round(chunk.blob.size / 1024) + 'KB' : 'غير محدد',
      duration: chunk.duration ? chunk.duration.toFixed(1) + 's' : 'غير محدد',
      startTime: chunk.startTime ? chunk.startTime.toFixed(1) + 's' : 'غير محدد',
      endTime: chunk.endTime ? chunk.endTime.toFixed(1) + 's' : 'غير محدد'
    });

    try {
      // التحقق من صحة المقطع قبل المعالجة
      if (!chunk.blob) {
        throw new Error('المقطع لا يحتوي على بيانات صوتية');
      }

      if (chunk.blob.size < 1000) {
        throw new Error(`المقطع صغير جداً: ${chunk.blob.size} بايت`);
      }

      console.log(`🔍 [فحص المقطع ${chunkIndex}] المقطع صالح للمعالجة`);

      // بدء تحويل الصوت إلى نص مع مهلة زمنية محددة
      console.log(`⚙️ [تحويل المقطع ${chunkIndex}] بدء التعرف على الكلام باللهجة الجزائرية`);
      
      const transcriptionPromise = this.transcribeAudioBlobDirectly(chunk.blob);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`انتهت المهلة الزمنية للمقطع ${chunkIndex} (30 ثانية)`));
        }, 30000); // مهلة 30 ثانية لكل مقطع
      });

      const text = await Promise.race([transcriptionPromise, timeoutPromise]);

      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(1);

      if (!text || text.trim().length < 3) {
        console.warn(`⚠️ [المقطع ${chunkIndex} فارغ] لم يُستخرج نص (وقت المعالجة: ${processingTime}s)`);
        return '';
      }

      // التحقق من النص الاحتياطي
      if (this.isFallbackText(text)) {
        console.warn(`⚠️ [نص احتياطي في المقطع ${chunkIndex}] تم رفض النص الاحتياطي`);
        return '';
      }

      console.log(`✅ [نجح المقطع ${chunkIndex}] استخراج نص بطول ${text.length} حرف في ${processingTime}s`);
      console.log(`📄 [محتوى المقطع ${chunkIndex}] "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);

      return text;

    } catch (error) {
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(1);
      
      console.error(`❌ [فشل المقطع ${chunkIndex}] خطأ في المعالجة (${processingTime}s):`, {
        error: error.message,
        chunkInfo: {
          size: chunk.blob ? chunk.blob.size : 'غير محدد',
          type: chunk.blob ? chunk.blob.type : 'غير محدد',
          duration: chunk.duration,
          index: chunkIndex
        }
      });

      // إعادة رفع الخطأ ليتم التعامل معه في المستوى الأعلى
      throw error;

    } finally {
      // تنظيف فوري للذاكرة بعد كل مقطع وفقاً للتوصيات
      console.log(`🧹 [تنظيف المقطع ${chunkIndex}] تحرير ذاكرة المقطع`);
      if (chunk.blob) {
        chunk.blob = null;
      }
    }
  }

  // الدالة الأصلية محتفظ بها للتوافق مع الكود الموجود
  async processChunkToText(chunk) {
    try {
      const text = await this.transcribeAudioBlobDirectly(chunk.blob);
      return text;
    } catch (error) {
      console.error("خطأ في معالجة المقطع:", error);
      return "";
    } finally {
      chunk.blob = null;
    }
  }

  // تقسيم محسن مع حدود آمنة للذاكرة
  async splitAudioIntoOptimizedChunks(audioBlob, totalDuration) {
    console.log(`\n🔧 [بدء التقسيم المحسن] مدة التسجيل: ${totalDuration.toFixed(1)} ثانية، حجم الملف: ${Math.round(audioBlob.size / 1024)}KB`);
    
    // فحص صحة المدة مرة أخرى
    if (!totalDuration || totalDuration === Infinity || isNaN(totalDuration) || totalDuration <= 0) {
      console.error(`❌ [مدة غير صالحة للتقسيم] ${totalDuration}`);
      throw new Error(`لا يمكن تقسيم تسجيل بمدة غير صالحة: ${totalDuration}`);
    }

    try {
      // حساب الحجم الأمثل للمقاطع (20-30 ثانية بدقة حسب التوصيات)
      let optimalChunkDuration;
      
      if (totalDuration <= 30) {
        // للتسجيلات القصيرة جداً: مقطع واحد
        optimalChunkDuration = totalDuration;
        console.log(`📝 [تسجيل قصير] مقطع واحد بطول ${optimalChunkDuration.toFixed(1)}s`);
      } else if (totalDuration <= 60) {
        // للتسجيلات أقل من دقيقة: مقاطع 20 ثانية
        optimalChunkDuration = 20;
      } else if (totalDuration <= 300) {
        // للتسجيلات 1-5 دقائق: مقاطع 25 ثانية
        optimalChunkDuration = 25;
      } else {
        // للتسجيلات الطويلة: مقاطع 30 ثانية
        optimalChunkDuration = 30;
      }
      
      const numChunks = Math.ceil(totalDuration / optimalChunkDuration);
      
      // فحص عدد المقاطع
      if (numChunks > 50) { // حد أقصى 50 مقطع
        console.error(`❌ [مقاطع كثيرة] ${numChunks} مقطع يتجاوز الحد الأقصى (50)`);
        throw new Error(`عدد المقاطع المطلوبة (${numChunks}) يتجاوز الحد الأقصى المسموح (50)`);
      }
      
      console.log(`📊 [استراتيجية التقسيم] ${numChunks} مقطع × ${optimalChunkDuration}s لكل مقطع`);
      console.log(`📈 [كفاءة التقسيم] تغطية: ${((numChunks * optimalChunkDuration) / totalDuration * 100).toFixed(1)}%`);

      // فحص دعم Web Audio API
      if (!this.audioContext) {
        console.warn(`⚠️ [تحذير] Web Audio API غير متاح، استخدام تقسيم Blob البديل`);
        return this.splitAudioBlobIntoOptimizedChunks(audioBlob, totalDuration, numChunks, optimalChunkDuration);
      }

      // التقسيم المتقدم باستخدام Web Audio API
      console.log(`⚙️ [Web Audio API] بدء فك تشفير الملف الصوتي`);
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      console.log(`🎵 [معلومات الصوت] القنوات: ${audioBuffer.numberOfChannels}, معدل العينة: ${audioBuffer.sampleRate}Hz`);

      let chunks = [];
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      let successfulChunks = 0;

      // تطبيق حلقة التقسيم مع سجلات تفصيلية مطورة
      console.log(`\n🔄 [بدء حلقة التقسيم] معالجة ${numChunks} مقطع`);
      
      for (let i = 0; i < numChunks; i++) {
        const start = i * optimalChunkDuration;
        const end = Math.min((i + 1) * optimalChunkDuration, totalDuration);
        const chunkDuration = end - start;
        
        console.log(`\n📦 [إنشاء المقطع ${i + 1}/${numChunks}] ⏰ ${start.toFixed(1)}s → ${end.toFixed(1)}s (مدة: ${chunkDuration.toFixed(1)}s)`);
        
        // حساب العينات الصوتية
        const startSample = Math.floor(start * sampleRate);
        const endSample = Math.floor(end * sampleRate);
        const chunkLength = endSample - startSample;
        
        console.log(`🔢 [عينات المقطع ${i + 1}] من عينة ${startSample} إلى ${endSample} (${chunkLength} عينة)`);

        if (chunkLength <= 0) {
          console.warn(`⚠️ [تحذير المقطع ${i + 1}] طول غير صالح: ${chunkLength} عينة، تجاهل`);
          continue;
        }

        if (chunkLength < sampleRate * 0.5) { // أقل من نصف ثانية
          console.warn(`⚠️ [مقطع قصير جداً ${i + 1}] ${(chunkLength/sampleRate).toFixed(2)}s فقط، قد لا يحتوي على محتوى مفيد`);
        }

        try {
          console.log(`⚙️ [معالجة المقطع ${i + 1}] إنشاء buffer: ${chunkLength} عينة، ${numberOfChannels} قناة`);
          
          // إنشاء buffer جديد للمقطع
          const chunkBuffer = this.audioContext.createBuffer(
            numberOfChannels,
            chunkLength,
            sampleRate
          );

          // نسخ البيانات الصوتية بكفاءة
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const sourceChannelData = audioBuffer.getChannelData(channel);
            const chunkChannelData = chunkBuffer.getChannelData(channel);
            
            // نسخ مجموعة من العينات بدلاً من عينة واحدة في كل مرة
            const sourceSubArray = sourceChannelData.subarray(startSample, endSample);
            chunkChannelData.set(sourceSubArray);
          }

          // تحويل Buffer إلى Blob
          console.log(`🔄 [تحويل المقطع ${i + 1}] تحويل AudioBuffer إلى Blob`);
          const chunkBlob = await this.audioBufferToBlob(chunkBuffer);
          
          // التحقق من صحة المقطع المُنشأ
          if (!chunkBlob || chunkBlob.size < 1000) {
            throw new Error(`المقطع المُنشأ صغير جداً: ${chunkBlob ? chunkBlob.size : 0} بايت`);
          }

          // إضافة المقطع للمصفوفة
          chunks.push({
            blob: chunkBlob,
            startTime: start,
            endTime: end,
            index: i,
            duration: chunkDuration,
            size: chunkBlob.size,
            sampleCount: chunkLength,
            isOptimized: true
          });

          successfulChunks++;
          console.log(`✅ [نجح المقطع ${i + 1}] حجم: ${Math.round(chunkBlob.size / 1024)}KB، مدة: ${chunkDuration.toFixed(1)}s`);

        } catch (chunkError) {
          console.error(`❌ [فشل المقطع ${i + 1}]`, {
            error: chunkError.message,
            startSample: startSample,
            endSample: endSample,
            chunkLength: chunkLength
          });
          continue;
        }

        // توقف قصير لتجنب حمل النظام (كل 5 مقاطع)
        if ((i + 1) % 5 === 0 && i < numChunks - 1) {
          console.log(`⏸️ [استراحة] توقف قصير بعد ${i + 1} مقاطع`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`\n📈 [نتيجة التقسيم النهائية]`);
      console.log(`   ✅ مقاطع ناجحة: ${successfulChunks}/${numChunks}`);
      console.log(`   📊 معدل النجاح: ${((successfulChunks/numChunks)*100).toFixed(1)}%`);
      console.log(`   💾 إجمالي الحجم: ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.size, 0) / 1024)}KB`);

      if (successfulChunks === 0) {
        throw new Error('فشل في إنشاء أي مقطع صالح من التقسيم المتقدم');
      }

      return chunks;

    } catch (error) {
      console.error(`💥 [فشل التقسيم المتقدم]`, {
        error: error.message,
        totalDuration: totalDuration,
        fileSize: audioBlob.size
      });
      
      // استخدام التقسيم البديل
      console.log(`🔄 [التقسيم البديل] التبديل إلى طريقة Blob slicing`);
      return this.splitAudioBlobIntoOptimizedChunks(audioBlob, totalDuration, Math.ceil(totalDuration / 25), 25);
    }
  }

  // الدالة الأصلية محتفظ بها للتوافق
  async splitAudioIntoRealChunks(audioBlob, totalDuration) {
    return this.splitAudioIntoOptimizedChunks(audioBlob, totalDuration);
  }

  // تقسيم Blob محسن كطريقة بديلة وفقاً للتوصيات
  async splitAudioBlobIntoOptimizedChunks(audioBlob, totalDuration, numChunks, chunkDuration = 25) {
    console.log(`\n📂 [تقسيم Blob البديل] بدء التقسيم البديل`);
    console.log(`📊 [معاملات التقسيم] ${numChunks} مقاطع، ${chunkDuration}s لكل مقطع`);
    
    const chunks = [];
    const bytesPerSecond = audioBlob.size / totalDuration;
    let successfulChunks = 0;
    let failedChunks = 0;
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkDuration;
      const end = Math.min((i + 1) * chunkDuration, totalDuration);
      const actualDuration = end - start;
      
      console.log(`\n📦 [إنشاء مقطع بديل ${i + 1}/${numChunks}] ${start.toFixed(1)}s → ${end.toFixed(1)}s`);
      
      try {
        // حساب موقع البايتات بدقة أكبر
        const startByte = Math.floor(start * bytesPerSecond);
        const endByte = Math.min(Math.floor(end * bytesPerSecond), audioBlob.size);
        const chunkSizeBytes = endByte - startByte;
        
        if (chunkSizeBytes < 1000) {
          throw new Error(`حجم المقطع صغير جداً: ${chunkSizeBytes} بايت`);
        }
        
        console.log(`⚙️ [تقطيع المقطع ${i + 1}] بايت ${startByte} → ${endByte} (${Math.round(chunkSizeBytes/1024)}KB)`);
        
        const chunkBlob = audioBlob.slice(startByte, endByte, audioBlob.type);
        
        // التحقق من صحة المقطع المُنشأ
        if (!chunkBlob || chunkBlob.size < 1000) {
          throw new Error(`فشل إنشاء مقطع صالح: ${chunkBlob ? chunkBlob.size : 0} بايت`);
        }
        
        chunks.push({
          blob: chunkBlob,
          startTime: start,
          endTime: end,
          index: i,
          duration: actualDuration,
          size: chunkBlob.size,
          startByte: startByte,
          endByte: endByte,
          isSliced: true,
          isOptimized: true
        });
        
        successfulChunks++;
        console.log(`✅ [نجح المقطع البديل ${i + 1}] ${actualDuration.toFixed(1)}s، ${Math.round(chunkBlob.size/1024)}KB`);
        
      } catch (sliceError) {
        failedChunks++;
        console.error(`❌ [فشل المقطع البديل ${i + 1}]`, {
          error: sliceError.message,
          chunkIndex: i,
          startTime: start,
          endTime: end
        });
      }

      // توقف قصير كل 5 مقاطع
      if ((i + 1) % 5 === 0 && i < numChunks - 1) {
        console.log(`⏸️ [استراحة بديلة] توقف قصير بعد ${i + 1} مقاطع`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n📈 [نتيجة التقسيم البديل]`);
    console.log(`   ✅ مقاطع ناجحة: ${successfulChunks}`);
    console.log(`   ❌ مقاطع فاشلة: ${failedChunks}`);
    console.log(`   📊 معدل النجاح: ${((successfulChunks/numChunks)*100).toFixed(1)}%`);
    console.log(`   💾 إجمالي الحجم: ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.size, 0) / 1024)}KB`);

    if (successfulChunks === 0) {
      throw new Error('فشل في إنشاء أي مقطع صالح من التقسيم البديل');
    }
    
    return chunks;
  }

  // الدالة الأصلية محتفظ بها للتوافق
  async splitAudioBlobIntoChunks(audioBlob, totalDuration, numChunks) {
    return this.splitAudioBlobIntoOptimizedChunks(audioBlob, totalDuration, numChunks, this.maxChunkDuration);
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

  // تحويل محسن للصوت إلى نص مع معالجة شاملة للأخطاء
  async transcribeAudioBlobDirectly(audioBlob) {
    const transcriptionStartTime = Date.now();
    
    return new Promise((resolve, reject) => {
      console.log(`🎙️ [بدء التحويل] حجم المقطع: ${Math.round(audioBlob.size / 1024)}KB`);
      
      if (!this.isSupported) {
        const errorMsg = 'متصفحك لا يدعم التعرف على الكلام';
        console.error(`❌ [عدم دعم المتصفح] ${errorMsg}`);
        return reject(new Error(errorMsg));
      }

      let finalTranscript = '';
      let interimTranscript = '';
      let recognitionStarted = false;
      let audioElement = null;
      let cleanupDone = false;
      let timeoutId = null;
      let resultCount = 0;

      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;

        console.log(`🧹 [تنظيف التحويل] تحرير الموارد`);

        try {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (this.recognition && recognitionStarted) {
            this.recognition.stop();
          }
        } catch (e) {
          console.warn(`⚠️ [تحذير التنظيف] خطأ في إيقاف التعرف: ${e.message}`);
        }

        try {
          if (audioElement) {
            audioElement.pause();
            if (audioElement.src && audioElement.src.startsWith('blob:')) {
              URL.revokeObjectURL(audioElement.src);
            }
            audioElement.src = '';
          }
        } catch (e) {
          console.warn(`⚠️ [تحذير التنظيف] خطأ في تنظيف الصوت: ${e.message}`);
        }
      };

      try {
        // إعداد محسن للهجة الجزائرية
        console.log(`⚙️ [إعداد التعرف] تهيئة التعرف على الكلام للهجة الجزائرية`);
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true; // نتائج مؤقتة للتتبع الأفضل
        this.recognition.maxAlternatives = 2; // بدائل متعددة للدقة
        
        // دعم أفضل للهجة الجزائرية
        this.recognition.lang = 'ar-SA'; // العربية السعودية لأفضل دعم
        console.log(`🌍 [اللغة] تم تعيين اللغة إلى: ${this.recognition.lang}`);

        // مهلة زمنية ديناميكية حسب حجم المقطع
        const timeoutDuration = Math.min(30000, Math.max(15000, audioBlob.size / 1000 * 10)); // 15-30 ثانية
        console.log(`⏰ [المهلة الزمنية] ${timeoutDuration/1000} ثانية`);

        timeoutId = setTimeout(() => {
          console.log(`⏰ [انتهاء المهلة] انتهت المهلة الزمنية (${timeoutDuration/1000}s)`);
          cleanup();

          const result = finalTranscript.trim() || interimTranscript.trim();
          if (result && result.length > 5) {
            console.log(`✅ [نتيجة جزئية] نص مستخرج عند انتهاء المهلة: "${result.substring(0, 50)}..."`);
            resolve(result);
          } else {
            console.warn(`⚠️ [مهلة فارغة] لم يتم استخراج نص كافي خلال المهلة الزمنية`);
            reject(new Error('انتهت المهلة الزمنية بدون استخراج نص كافي'));
          }
        }, timeoutDuration);

        // معالج بدء التعرف
        this.recognition.onstart = () => {
          recognitionStarted = true;
          console.log(`🚀 [بدء التعرف] التعرف على الكلام نشط`);
        };

        // معالج النتائج مع سجلات تفصيلية
        this.recognition.onresult = (event) => {
          console.log(`📊 [نتيجة] استلام نتيجة رقم ${++resultCount}`);
          
          let currentInterim = '';
          let newFinalText = '';

          try {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              const transcript = result[0].transcript;
              const confidence = result[0].confidence || 0;
              
              console.log(`📝 [نتيجة ${i}] نهائية: ${result.isFinal}, نص: "${transcript.substring(0, 30)}...", ثقة: ${(confidence * 100).toFixed(1)}%`);

              if (result.isFinal) {
                if (transcript && transcript.trim().length > 2) {
                  newFinalText += transcript.trim() + ' ';
                  console.log(`✅ [نص نهائي] "${transcript.trim()}"`);
                }
              } else {
                currentInterim += transcript;
              }
            }

            // تحديث النصوص
            if (newFinalText) {
              finalTranscript += newFinalText;
              console.log(`📄 [إجمالي النص النهائي] ${finalTranscript.length} حرف`);
            }

            interimTranscript = currentInterim;
            if (interimTranscript) {
              console.log(`🔄 [نص مؤقت] "${interimTranscript.substring(0, 50)}..."`);
            }

          } catch (resultError) {
            console.error(`❌ [خطأ معالجة النتيجة]`, {
              error: resultError.message,
              eventResultsLength: event.results ? event.results.length : 0,
              resultIndex: event.resultIndex
            });
          }
        };

        // معالج الأخطاء مع تفاصيل شاملة
        this.recognition.onerror = (event) => {
          const processingTime = ((Date.now() - transcriptionStartTime) / 1000).toFixed(1);
          
          console.error(`💥 [خطأ التعرف] خطأ في التعرف على الكلام (${processingTime}s):`, {
            error: event.error,
            message: event.message,
            finalTranscriptLength: finalTranscript.length,
            interimTranscriptLength: interimTranscript.length,
            resultCount: resultCount
          });

          cleanup();

          // محاولة إنقاذ أي نص تم استخراجه
          const salvageText = finalTranscript.trim() || interimTranscript.trim();
          if (salvageText && salvageText.length > 5) {
            console.log(`🆘 [إنقاذ النص] نص منقذ بطول ${salvageText.length} حرف: "${salvageText.substring(0, 50)}..."`);
            resolve(salvageText);
          } else {
            const errorMessage = `فشل التعرف: ${event.error} - ${event.message || 'لا توجد تفاصيل إضافية'}`;
            console.error(`❌ [فشل نهائي] ${errorMessage}`);
            reject(new Error(errorMessage));
          }
        };

        // معالج انتهاء التعرف
        this.recognition.onend = () => {
          const processingTime = ((Date.now() - transcriptionStartTime) / 1000).toFixed(1);
          console.log(`🏁 [انتهاء التعرف] انتهى التعرف على الكلام (${processingTime}s)`);
          
          cleanup();

          const result = finalTranscript.trim() || interimTranscript.trim();
          
          console.log(`📊 [النتيجة النهائية] طول النص: ${result.length}, النتائج: ${resultCount}, الوقت: ${processingTime}s`);
          
          if (result && result.length > 3) {
            console.log(`✅ [نجاح التحويل] "${result.substring(0, 80)}..."`);
            resolve(result);
          } else {
            console.warn(`⚠️ [نتيجة فارغة] لم يتم استخراج نص كافي`);
            reject(new Error('لم يتم استخراج نص كافي من المقطع'));
          }
        };

        // إعداد وتشغيل الصوت
        console.log(`🎵 [إعداد الصوت] إنشاء عنصر الصوت`);
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement = new Audio(audioUrl);
        
        audioElement.volume = 1.0;
        audioElement.preload = 'auto';

        audioElement.oncanplay = () => {
          console.log(`🎼 [جاهز للتشغيل] الصوت محمل وجاهز`);
          
          try {
            this.recognition.start();
            console.log(`🎤 [تم بدء التعرف] بدء التعرف على الكلام`);
            
            // تأخير قبل تشغيل الصوت للسماح للتعرف بالتجهز
            setTimeout(() => {
              audioElement.play().then(() => {
                console.log(`▶️ [بدء التشغيل] تشغيل الصوت بدأ`);
              }).catch(playError => {
                console.warn(`⚠️ [تحذير التشغيل] خطأ في تشغيل الصوت: ${playError.message}`);
                // لا نرفع خطأ هنا لأن التعرف قد يعمل بدون تشغيل صريح
              });
            }, 1000);
          } catch (recognitionError) {
            console.error(`❌ [خطأ بدء التعرف] فشل في بدء التعرف: ${recognitionError.message}`);
            cleanup();
            reject(new Error(`فشل في بدء التعرف: ${recognitionError.message}`));
          }
        };

        audioElement.onerror = (error) => {
          console.error(`❌ [خطأ تحميل الصوت]`, {
            error: error.message || 'خطأ غير محدد',
            audioSrc: audioElement.src ? 'موجود' : 'مفقود',
            blobSize: audioBlob.size,
            blobType: audioBlob.type
          });
          
          cleanup();
          reject(new Error(`فشل في تحميل الصوت: ${error.message || 'خطأ غير محدد'}`));
        };

        audioElement.onloadstart = () => {
          console.log(`📥 [بدء التحميل] بدء تحميل الصوت`);
        };

        audioElement.onloadeddata = () => {
          console.log(`📊 [تم تحميل البيانات] بيانات الصوت محملة`);
        };

        // بدء تحميل الصوت
        console.log(`⏳ [تحميل الصوت] بدء تحميل عنصر الصوت`);
        audioElement.load();

      } catch (error) {
        console.error(`💥 [خطأ إعداد شامل]`, {
          error: error.message,
          stack: error.stack,
          blobSize: audioBlob.size,
          blobType: audioBlob.type
        });
        
        cleanup();
        reject(new Error(`فشل في إعداد التعرف: ${error.message}`));
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
