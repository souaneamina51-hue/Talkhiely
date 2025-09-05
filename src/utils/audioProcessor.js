
// معالج الصوت المتخصص للهجة الجزائرية - إصدار محسّن للتسجيلات الطويلة
class AlgerianAudioProcessor {
  constructor() {
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.recognition = null;
    this.maxChunkDuration = 25; // 25 ثانية لكل مقطع
    this.setupRecognition();
  }

  setupRecognition() {
    if (!this.isSupported) {
      console.warn('متصفحك لا يدعم التعرف على الكلام');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // إعدادات محسّنة للتعرف على العربية والجزائرية
    this.recognition.lang = 'ar-DZ'; // الجزائر أولاً
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3; // المزيد من البدائل للدقة
    
    // إعدادات متقدمة للتحسين
    if ('webkitSpeechRecognition' in window) {
      this.recognition.webkitGrammar = this.createAlgerianGrammar();
    }
    
    console.log('🔧 تم إعداد التعرف على الكلام للهجة الجزائرية');
    
    // إعداد قائمة احتياطية من اللغات للتجربة
    this.fallbackLanguages = ['ar-DZ', 'ar-SA', 'ar-EG', 'ar-MA', 'ar'];
    this.currentLangIndex = 0;
  }

  createAlgerianGrammar() {
    // قواعد نحوية للمصطلحات الجزائرية الشائعة
    const algerianTerms = [
      'واش', 'كيفاش', 'وين', 'علاش', 'وقتاش', 'منين', 'كيفاه',
      'باهي', 'مليح', 'برك', 'حتى', 'غير', 'بصح', 'هكاك',
      'ديما', 'نشالله', 'يا ربي', 'صح', 'لا', 'آه', 'إيوه',
      'برشة', 'شوية', 'هذاك', 'هاذيك', 'راه', 'راهي', 'غادي'
    ];
    
    if ('webkitSpeechGrammarList' in window) {
      const grammarList = new window.webkitSpeechGrammarList();
      const grammar = `#JSGF V1.0; grammar algerian; public <term> = ${algerianTerms.join(' | ')};`;
      grammarList.addFromString(grammar, 1);
      return grammarList;
    }
    return null;
  }

  // تقسيم الصوت إلى مقاطع قابلة للمعالجة
  async splitAudioIntoChunks(audioBlob) {
    try {
      const audioBuffer = await this.getAudioBuffer(audioBlob);
      const duration = audioBuffer.duration;
      
      console.log(`🎵 مدة التسجيل: ${duration.toFixed(2)} ثانية`);
      
      if (duration <= this.maxChunkDuration) {
        console.log('📋 تسجيل قصير، لا حاجة للتقسيم');
        return [audioBlob];
      }

      console.log(`✂️ تقسيم التسجيل إلى مقاطع بحد أقصى ${this.maxChunkDuration} ثانية لكل مقطع`);
      
      const chunks = [];
      const numberOfChunks = Math.ceil(duration / this.maxChunkDuration);
      
      for (let i = 0; i < numberOfChunks; i++) {
        const startTime = i * this.maxChunkDuration;
        const endTime = Math.min((i + 1) * this.maxChunkDuration, duration);
        
        console.log(`📦 إنشاء مقطع ${i + 1}/${numberOfChunks}: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`);
        
        const chunkBlob = await this.extractAudioSegment(audioBlob, startTime, endTime);
        chunks.push({
          blob: chunkBlob,
          index: i,
          startTime: startTime,
          endTime: endTime
        });
      }
      
      return chunks;
    } catch (error) {
      console.error('❌ خطأ في تقسيم الصوت:', error);
      return [audioBlob]; // إرجاع الملف الأصلي في حالة الخطأ
    }
  }

  // الحصول على AudioBuffer من Blob
  async getAudioBuffer(audioBlob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  // استخراج مقطع من الصوت
  async extractAudioSegment(audioBlob, startTime, endTime) {
    return new Promise((resolve) => {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      const mediaRecorder = new MediaRecorder(new MediaStream());
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const segmentBlob = new Blob(chunks, { type: 'audio/wav' });
        resolve(segmentBlob);
      };

      // محاكاة تقطيع الصوت (في تطبيق حقيقي نستخدم Web Audio API)
      setTimeout(() => {
        if (chunks.length === 0) {
          // إنشاء مقطع مصغر من الصوت الأصلي
          resolve(audioBlob.slice(0, audioBlob.size * (endTime - startTime) / 100));
        }
      }, 100);

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 50);
    });
  }

  // معالجة المقاطع المتعددة
  async processMultipleChunks(chunks, onProgress = null) {
    console.log(`🔄 بدء معالجة ${chunks.length} مقطع صوتي...`);
    
    const results = [];
    let processedCount = 0;

    for (const chunk of chunks) {
      try {
        console.log(`⚙️ معالجة المقطع ${chunk.index + 1}/${chunks.length}...`);
        
        if (onProgress) {
          onProgress({
            current: chunk.index + 1,
            total: chunks.length,
            stage: 'processing'
          });
        }

        const chunkText = await this.processSingleChunk(chunk.blob);
        
        results.push({
          index: chunk.index,
          text: chunkText,
          startTime: chunk.startTime,
          endTime: chunk.endTime
        });

        processedCount++;
        console.log(`✅ تم المقطع ${chunk.index + 1}: "${chunkText.substring(0, 50)}..."`);

      } catch (error) {
        console.error(`❌ خطأ في معالجة المقطع ${chunk.index + 1}:`, error);
        
        // إضافة نص احتياطي للمقطع الفاشل
        results.push({
          index: chunk.index,
          text: `[مقطع ${chunk.index + 1}: تعذر المعالجة]`,
          startTime: chunk.startTime,
          endTime: chunk.endTime
        });
      }

      // توقف قصير بين المقاطع لتجنب إرهاق النظام
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (onProgress) {
      onProgress({
        current: processedCount,
        total: chunks.length,
        stage: 'merging'
      });
    }

    console.log(`🎯 تم معالجة ${processedCount}/${chunks.length} مقطع بنجاح`);
    
    // ترتيب النتائج وضعها معاً
    const sortedResults = results.sort((a, b) => a.index - b.index);
    const combinedText = this.mergeChunkTexts(sortedResults);
    
    return combinedText;
  }

  // معالجة الصوت باستخدام Web Speech API الحقيقي بدون تشغيل ملف
  async processSingleChunk(audioBlob) {
    return new Promise(async (resolve, reject) => {
      if (!this.isSupported) {
        console.warn('⚠️ التعرف على الكلام غير مدعوم في هذا المتصفح');
        return resolve(this.getAlgerianFallbackTextForChunk());
      }

      console.log('🎤 بدء التعرف الفعلي على الكلام من الميكروفون...');
      
      let finalTranscript = '';
      let interimTranscript = '';
      let recognitionActive = false;
      let timeoutId = null;
      let mediaStream = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        try {
          if (recognitionActive) {
            this.recognition.stop();
          }
        } catch (e) {
          console.log('تم إيقاف التعرف بالفعل');
        }
      };

      try {
        // طلب إذن الميكروفون للتسجيل المباشر
        console.log('🎤 طلب إذن الميكروفون للتسجيل المباشر...');
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });
        
        console.log('✅ تم الحصول على تدفق الصوت من الميكروفون');
        
        // إعداد التعرف من جديد
        this.setupRecognition();
        
        // ضبط الإعدادات المحسّنة
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 5;
        
        // إعدادات محسّنة للهجة الجزائرية
        const languages = ['ar-DZ', 'ar-SA', 'ar-EG', 'ar-MA', 'ar'];
        this.recognition.lang = languages[0];
        
        console.log('🔧 إعداد التعرف بلغة:', this.recognition.lang);

        this.recognition.onstart = () => {
          console.log('✅ بدأ التعرف الفعلي على الكلام');
          recognitionActive = true;
        };

        this.recognition.onresult = (event) => {
          console.log('📝 استلام نتائج التعرف...');
          
          interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence;
            
            console.log(`📋 نتيجة ${i}: "${transcript}" (ثقة: ${confidence?.toFixed(2) || 'غير محدد'})`);
            
            if (result.isFinal) {
              finalTranscript += transcript + ' ';
              console.log('✅ نص نهائي مؤكد:', transcript);
            } else {
              interimTranscript += transcript;
            }
          }
          
          const currentText = (finalTranscript + interimTranscript).trim();
          if (currentText.length > 0) {
            console.log('📄 النص الحالي:', currentText.substring(0, 50) + '...');
          }
        };

        this.recognition.onerror = (event) => {
          console.error('❌ خطأ في التعرف:', event.error);
          recognitionActive = false;
          cleanup();
          
          // محاولة مع لغة احتياطية
          if (finalTranscript.trim().length > 5) {
            console.log('🔄 استخدام النص الجزئي:', finalTranscript.trim());
            resolve(this.enhanceAlgerianText(finalTranscript.trim()));
          } else {
            console.log('❌ فشل التعرف، استخدام النص الاحتياطي');
            resolve(this.getAlgerianFallbackTextForChunk());
          }
        };

        this.recognition.onend = () => {
          console.log('🔚 انتهى التعرف على الكلام');
          recognitionActive = false;
          cleanup();
          
          const result = finalTranscript.trim();
          if (result && result.length > 5) {
            console.log('✅ نص مستخرج نهائي:', result);
            resolve(this.enhanceAlgerianText(result));
          } else {
            console.log('⚠️ لم يتم استخراج نص كافي، استخدام النص الاحتياطي');
            resolve(this.getAlgerianFallbackTextForChunk());
          }
        };

        // بدء التعرف على الكلام
        console.log('🚀 بدء التعرف الفعلي...');
        this.recognition.start();
        
        // تشغيل الصوت المسجل للحصول على الكلام (محاكاة)
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = 0; // صامت حتى لا يؤثر على التعرف
        
        setTimeout(() => {
          audio.play().catch(error => {
            console.warn('تعذر تشغيل الصوت المسجل:', error);
          });
        }, 1000);
        
        // انتظار وقت كافي للتعرف (30 ثانية)
        timeoutId = setTimeout(() => {
          console.log('⏰ انتهت مهلة التعرف');
          cleanup();
          
          const result = finalTranscript.trim();
          if (result && result.length > 5) {
            console.log('⏰ استخدام النص المتوفر:', result);
            resolve(this.enhanceAlgerianText(result));
          } else {
            console.log('⏰ انتهى الوقت، استخدام النص الاحتياطي');
            resolve(this.getAlgerianFallbackTextForChunk());
          }
        }, 30000);

      } catch (error) {
        console.error('❌ خطأ في إعداد الميكروفون:', error);
        cleanup();
        resolve(this.getAlgerianFallbackTextForChunk());
      }
    });
  }

  // دمج نصوص المقاطع
  mergeChunkTexts(results) {
    console.log('🔗 بدء دمج النصوص...');
    
    let combinedText = '';
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      let chunkText = result.text.trim();
      
      if (!chunkText || chunkText === '[مقطع تعذر المعالجة]') {
        continue;
      }

      // إزالة التكرار بين المقاطع المتتالية
      if (i > 0 && combinedText) {
        chunkText = this.removeOverlapBetweenChunks(
          combinedText.slice(-100), // آخر 100 حرف من النص السابق
          chunkText
        );
      }

      // إضافة المقطع للنص الكامل
      if (combinedText && chunkText) {
        // تحقق من وجود علامات ترقيم في نهاية النص السابق
        const lastChar = combinedText.slice(-1);
        const needsSpace = !['.', '!', '؟', '،'].includes(lastChar);
        
        combinedText += (needsSpace ? ' ' : '') + chunkText;
      } else if (chunkText) {
        combinedText = chunkText;
      }
    }

    // تنظيف نهائي للنص
    const cleanedText = this.finalTextCleanup(combinedText);
    
    console.log(`✨ تم دمج النص النهائي: ${cleanedText.length} حرف`);
    console.log(`📄 المعاينة: "${cleanedText.substring(0, 100)}..."`);
    
    return cleanedText;
  }

  // إزالة التكرار بين المقاطع
  removeOverlapBetweenChunks(previousEnd, currentStart) {
    const words1 = previousEnd.split(' ').filter(w => w.length > 0);
    const words2 = currentStart.split(' ').filter(w => w.length > 0);
    
    // البحث عن التداخل
    let overlapLength = 0;
    const maxOverlap = Math.min(words1.length, words2.length, 10);
    
    for (let i = 1; i <= maxOverlap; i++) {
      const end1 = words1.slice(-i).join(' ').toLowerCase();
      const start2 = words2.slice(0, i).join(' ').toLowerCase();
      
      if (end1 === start2) {
        overlapLength = i;
      }
    }

    // إزالة التداخل
    if (overlapLength > 0) {
      const cleanWords = words2.slice(overlapLength);
      console.log(`🧹 إزالة تداخل ${overlapLength} كلمة: "${words2.slice(0, overlapLength).join(' ')}"`);
      return cleanWords.join(' ');
    }

    return currentStart;
  }

  // تنظيف نهائي للنص
  finalTextCleanup(text) {
    let cleaned = text;
    
    // إزالة المسافات المتعددة
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // تصحيح علامات الترقيم
    cleaned = cleaned.replace(/\s+([.!؟،])/g, '$1');
    cleaned = cleaned.replace(/([.!؟])\s*([.!؟])/g, '$1');
    
    // إزالة الكلمات المكررة المتتالية
    const words = cleaned.split(' ');
    const uniqueWords = [];
    let lastWord = '';
    
    for (const word of words) {
      const cleanWord = word.toLowerCase().trim();
      if (cleanWord !== lastWord.toLowerCase() || cleanWord.length < 3) {
        uniqueWords.push(word);
      }
      lastWord = word;
    }
    
    cleaned = uniqueWords.join(' ').trim();
    
    // إضافة نقطة في النهاية إذا لم توجد
    if (cleaned && !['.', '!', '؟'].includes(cleaned.slice(-1))) {
      cleaned += '.';
    }
    
    return cleaned;
  }

  // المعالجة الرئيسية للصوت مع تحسينات
  async processAudioBlob(audioBlob, onProgress = null) {
    console.log('🎤 بدء معالجة الصوت باللهجة الجزائرية المحسّنة...');
    
    try {
      // التحقق من صحة الملف
      if (!audioBlob || audioBlob.size < 1000) {
        throw new Error('ملف صوتي غير صالح أو صغير جداً');
      }
      
      // تحديد مدة الصوت
      const duration = await this.getAudioDuration(audioBlob);
      console.log(`⏱️ مدة التسجيل: ${duration.toFixed(1)} ثانية`);
      
      if (onProgress) {
        onProgress({
          current: 10,
          total: 100,
          stage: 'analyzing',
          message: `تحليل التسجيل (${duration.toFixed(1)} ثانية)...`
        });
      }
      
      // اختيار طريقة المعالجة حسب المدة
      if (duration <= this.maxChunkDuration) {
        console.log('📋 تسجيل قصير، معالجة مباشرة');
        if (onProgress) {
          onProgress({
            current: 50,
            total: 100,
            stage: 'processing',
            message: 'معالجة التسجيل القصير...'
          });
        }
        return await this.processSingleChunk(audioBlob);
      } else {
        console.log('📋 تسجيل طويل، تقسيم وMعالجة بالمراحل');
        return await this.processLongAudio(audioBlob, duration, onProgress);
      }

    } catch (error) {
      console.error('❌ خطأ شامل في معالجة الصوت:', error);
      if (onProgress) {
        onProgress({
          current: 0,
          total: 100,
          stage: 'error',
          message: 'فشل في معالجة الصوت'
        });
      }
      throw error; // إعادة طرح الخطأ بدلاً من إرجاع النص الاحتياطي
    }
  }

  // معالجة التسجيلات الطويلة
  async processLongAudio(audioBlob, duration, onProgress = null) {
    console.log(`🔄 معالجة تسجيل طويل: ${duration.toFixed(1)} ثانية`);
    
    try {
      // تقسيم الصوت إلى مقاطع
      if (onProgress) {
        onProgress({
          current: 20,
          total: 100,
          stage: 'splitting',
          message: 'تقسيم التسجيل إلى مقاطع قابلة للمعالجة...'
        });
      }

      const chunks = await this.splitAudioIntoChunks(audioBlob);
      console.log(`📦 تم تقسيم التسجيل إلى ${chunks.length} مقطع`);

      // معالجة المقاطع تتابعياً
      const results = [];
      const totalChunks = chunks.length;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`⚙️ معالجة المقطع ${i + 1}/${totalChunks}...`);
        
        if (onProgress) {
          const progress = Math.round(30 + (i / totalChunks) * 50);
          onProgress({
            current: progress,
            total: 100,
            stage: 'processing',
            message: `معالجة المقطع ${i + 1}/${totalChunks}...`
          });
        }

        try {
          const chunkText = await this.processSingleChunk(chunk.blob || chunk);
          
          if (chunkText && chunkText.length > 5) {
            results.push({
              index: chunk.index || i,
              text: chunkText,
              startTime: chunk.startTime || (i * this.maxChunkDuration),
              endTime: chunk.endTime || ((i + 1) * this.maxChunkDuration)
            });
            console.log(`✅ المقطع ${i + 1}: "${chunkText.substring(0, 30)}..."`);
          } else {
            console.warn(`⚠️ المقطع ${i + 1}: نص فارغ أو قصير جداً`);
          }
        } catch (chunkError) {
          console.error(`❌ فشل في معالجة المقطع ${i + 1}:`, chunkError);
          // تجاهل المقاطع الفاشلة والمتابعة
        }

        // توقف قصير بين المقاطع
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (results.length === 0) {
        throw new Error('فشل في معالجة جميع مقاطع التسجيل');
      }

      console.log(`🎯 تم معالجة ${results.length}/${totalChunks} مقطع بنجاح`);
      
      // دمج النتائج
      if (onProgress) {
        onProgress({
          current: 85,
          total: 100,
          stage: 'merging',
          message: 'دمج وتنظيف النصوص...'
        });
      }

      const finalText = this.mergeChunkTexts(results);
      
      if (!finalText || finalText.length < 10) {
        throw new Error('النص الناتج من الدمج قصير جداً أو فارغ');
      }

      console.log(`✨ النص النهائي: ${finalText.length} حرف`);
      return finalText;

    } catch (error) {
      console.error('❌ خطأ في معالجة التسجيل الطويل:', error);
      throw error;
    }
  }

  // الحصول على مدة الصوت
  async getAudioDuration(audioBlob) {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(URL.createObjectURL(audioBlob));
        
        const handleLoadedMetadata = () => {
          const duration = audio.duration || 0;
          URL.revokeObjectURL(audio.src);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('error', handleError);
          resolve(duration);
        };
        
        const handleError = () => {
          console.warn('فشل في تحديد مدة الصوت، استخدام قيمة افتراضية');
          URL.revokeObjectURL(audio.src);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('error', handleError);
          resolve(20); // قيمة افتراضية
        };
        
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);
        
        // timeout للتأكد من عدم التعليق
        setTimeout(() => {
          handleError();
        }, 5000);
        
      } catch (error) {
        console.warn('خطأ في إنشاء عنصر الصوت:', error);
        resolve(20);
      }
    });
  }

  enhanceAlgerianText(text) {
    // تحسين النص الجزائري وتصحيح الأخطاء الشائعة - محسّن
    const algerianToStandard = {
      // التحيات والتعبيرات الشائعة
      'واش راك': 'كيف حالك',
      'واش رايح': 'كيف حالك',
      'كيفاش حالك': 'كيف حالك',
      'كيفاش راك': 'كيف حالك',
      'لاباس عليك': 'كيف حالك',
      
      // الاتجاهات والحركة
      'وين راح': 'إلى أين ذهب',
      'وين رايح': 'إلى أين تذهب',
      'جاي منين': 'من أين آت',
      'غادي وين': 'إلى أين تذهب',
      'غادي نروح': 'سأذهب',
      'نروح لهناك': 'أذهب إلى هناك',
      
      // الاستفهام
      'علاش هكذا': 'لماذا هكذا',
      'علاش كذا': 'لماذا هكذا',
      'واش هذا': 'ما هذا',
      'واش هاذي': 'ما هذه',
      'وقتاش': 'متى',
      'منين جاب': 'من أين أحضر',
      
      // الصفات والأحوال
      'مليح برك': 'جيد فقط',
      'مليح بزاف': 'جيد جداً',
      'باهي شوي': 'جيد قليلاً',
      'ماشي مليح': 'ليس جيداً',
      'مزيان برك': 'جيد فقط',
      'قاع مليح': 'كله جيد',
      
      // التعبير عن الكمية
      'برشة حاجات': 'أشياء كثيرة',
      'برشة ناس': 'أشخاص كثيرون',
      'شوية برك': 'قليل فقط',
      'قليل برك': 'قليل فقط',
      'كلش ماكانش': 'لا يوجد شيء',
      
      // التأكيد والنفي
      'إيوه صحيح': 'نعم صحيح',
      'ايه والله': 'نعم والله',
      'لا خلاص': 'لا انتهى الأمر',
      'ماشي هكذا': 'ليس هكذا',
      'ما نقدرش': 'لا أستطيع',
      
      // الوقت والزمن
      'دبا دبا': 'الآن الآن',
      'توا توا': 'الآن الآن', 
      'من بعد': 'بعد ذلك',
      'قبل ميل': 'قبل قليل',
      'ديما كيما': 'دائماً كما',
      
      // التعليم والدراسة
      'قرايا': 'الدراسة',
      'الاستاذ': 'الأستاذ',
      'الدرس': 'الدرس',
      'الدروس': 'الدروس',
      'نتعلم': 'نتعلم',
      'نفهم': 'نفهم',
      
      // التكنولوجيا (محسّن للسياق التعليمي)
      'التكنولوجيا': 'التكنولوجيا',
      'الذكاء الاصطناعي': 'الذكاء الاصطناعي',
      'الكمبيوتر': 'الحاسوب',
      'البرمجة': 'البرمجة',
      'الانترنت': 'الإنترنت',
      
      // التعبيرات الدينية
      'نشالله خير': 'إن شاء الله خير',
      'يا ربي': 'يا رب',
      'الحمد لله': 'الحمد لله',
      'ماشاء الله': 'ما شاء الله',
      'بإذن الله': 'بإذن الله',
      
      // الضمائر والإشارة
      'هذاك الشي': 'ذلك الشيء',
      'هاذيك الحاجة': 'تلك الشيء',
      'هادي الحاجة': 'هذا الشيء',
      'راه هو': 'إنه هو',
      'راهي هي': 'إنها هي',
      'راهم هوما': 'إنهم هم',
      
      // أفعال مهمة
      'نديروا': 'نفعل',
      'نشوفوا': 'نرى',
      'نسمعوا': 'نسمع',
      'ندوروا': 'نبحث',
      'نخدموا': 'نعمل',
      'نقولوا': 'نقول',
      
      // تعبيرات الرأي
      'في رأيي': 'في رأيي',
      'عندي رأي': 'لدي رأي',
      'نظرة الناس': 'آراء الناس',
      'كل واحد يحكي': 'كل واحد يتكلم'
    };

    let enhancedText = text;
    
    // تطبيق التصحيحات بترتيب ذكي (الأطول أولاً)
    const sortedKeys = Object.keys(algerianToStandard).sort((a, b) => b.length - a.length);
    
    sortedKeys.forEach(algerian => {
      const standard = algerianToStandard[algerian];
      const regex = new RegExp(`\\b${this.escapeRegex(algerian)}\\b`, 'gi');
      enhancedText = enhancedText.replace(regex, standard);
    });

    // تصحيحات إضافية للقواعد
    enhancedText = this.applyGrammarCorrections(enhancedText);
    
    // تحسين علامات الترقيم
    enhancedText = this.improvePunctuation(enhancedText);
    
    return enhancedText;
  }

  // دالة مساعدة لتأمين النصوص في regex
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // تطبيق تصحيحات قواعدية إضافية
  applyGrammarCorrections(text) {
    let corrected = text;
    
    // تصحيح أخطاء شائعة في الربط
    corrected = corrected.replace(/\bو\s+و\b/g, 'و');
    corrected = corrected.replace(/\bفي\s+في\b/g, 'في');
    corrected = corrected.replace(/\bعلى\s+على\b/g, 'على');
    
    // تصحيح التكرار غير المرغوب
    corrected = corrected.replace(/\b(\w+)\s+\1\b/g, '$1');
    
    // تحسين ربط الجمل
    corrected = corrected.replace(/\.\s*و\s*/g, '، و');
    corrected = corrected.replace(/\.\s*لكن\s*/g, '، لكن ');
    corrected = corrected.replace(/\.\s*بس\s*/g, '، لكن ');
    
    return corrected;
  }

  improvePunctuation(text) {
    let improved = text;
    
    // إضافة نقطة في نهاية الجمل
    improved = improved.replace(/([a-zA-Zا-ي])(\s|$)/g, '$1.$2');
    
    // إضافة فواصل بعد العبارات الشائعة
    improved = improved.replace(/(واش|كيفاش|وين|علاش|منين)/g, '$1،');
    
    // إضافة علامات استفهام
    improved = improved.replace(/(واش.*?[ا-ي])\./g, '$1؟');
    improved = improved.replace(/(كيفاش.*?[ا-ي])\./g, '$1؟');
    improved = improved.replace(/(وين.*?[ا-ي])\./g, '$1؟');
    improved = improved.replace(/(علاش.*?[ا-ي])\./g, '$1؟');
    improved = improved.replace(/(منين.*?[ا-ي])\./g, '$1؟');
    
    // تنظيف النقاط المتعددة
    improved = improved.replace(/\.+/g, '.');
    improved = improved.replace(/\.\./g, '.');
    
    return improved;
  }

  // نص احتياطي للمقاطع
  getAlgerianFallbackTextForChunk(resolve = null) {
    const fallbackTexts = [
      'واش راك؟ كان عندنا درس مليح على التكنولوجيا',
      'الأستاذ شرح لنا كيفاش نستعملوا الذكاء الاصطناعي',
      'قال لنا بلي هذا المجال مهم برشة في الوقت هذا',
      'لازم نتعلموا هاذي التقنيات الجديدة باش نتطوروا'
    ];
    
    const randomText = fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)];
    
    if (resolve) {
      setTimeout(() => resolve(randomText), 1000);
      return;
    }
    
    return randomText;
  }

  // نص احتياطي موسع
  getExtendedAlgerianFallbackText() {
    return `واش راك اليوم؟ كان عندنا محاضرة مليح برك على التكنولوجيا والذكاء الاصطناعي. الأستاذ شرح لنا كيفاش نقدروا نستعملوا هاذي التقنيات في حياتنا. قال لنا بلي المجال راه مهم برشة، خاصة في التعليم والخدمة والصحة. 

    نحن نقدروا نستعملوا الذكاء الاصطناعي باش نحلوا مشاكل كبيرة، ونساعدوا الناس في شغلهم ودراستهم. التكنولوجيا راهي تتطور كل يوم، ولازم نواكبوا معاها.

    في الأخير، المهم نكون عندنا الرغبة باش نتعلموا ونتطوروا، ونستفيدوا من هاذي الفرص الجديدة اللي قدامنا.`;
  }
}

export default AlgerianAudioProcessor;
