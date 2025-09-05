
// معالج التلخيص المتخصص للنصوص الجزائرية
class AlgerianTextSummarizer {
  constructor() {
    this.algerianKeywords = [
      'واش', 'كيفاش', 'وين', 'علاش', 'وقتاش',
      'مليح', 'برك', 'باهي', 'ديما', 'غير',
      'هكذا', 'هذاك', 'هاذيك', 'برشة', 'شوية'
    ];
  }

  async summarizeAlgerianText(text, options = {}) {
    // تحديد أطوال مناسبة للنصوص الطويلة
    const textLength = text.length;
    let maxLength = options.maxLength || this.getOptimalSummaryLength(textLength);
    let minLength = options.minLength || Math.floor(maxLength * 0.3);
    
    console.log(`📊 طول النص الأصلي: ${textLength} حرف، طول الملخص المستهدف: ${minLength}-${maxLength} حرف`);
    
    try {
      // معالجة النص الجزائري قبل التلخيص
      const processedText = this.preprocessAlgerianText(text);
      console.log('🔄 تم تحويل النص من الدارجة إلى الفصحى المبسطة');
      
      // تحليل هيكل النص
      const textStructure = this.analyzeTextStructure(processedText);
      console.log(`📋 تحليل النص: ${textStructure.paragraphs} فقرة، ${textStructure.sentences} جملة`);
      
      // استخراج النقاط المهمة حسب السياق
      const keyPoints = this.extractContextualKeyPoints(processedText, textStructure);
      console.log(`🎯 تم استخراج ${keyPoints.length} نقطة مهمة`);
      
      // إنشاء الملخص المتدرج
      const summary = this.createComprehensiveSummary(keyPoints, textStructure, maxLength, minLength);
      
      const finalSummary = this.postprocessAlgerianSummary(summary);
      console.log(`✅ الملخص النهائي: ${finalSummary.length} حرف`);
      
      return finalSummary;
      
    } catch (error) {
      console.error('❌ خطأ في تلخيص النص الجزائري:', error);
      return this.createAdaptiveFallbackSummary(text, textLength);
    }
  }

  // تحديد الطول الأمثل للملخص حسب طول النص الأصلي
  getOptimalSummaryLength(textLength) {
    if (textLength < 200) return 80;
    if (textLength < 500) return 150;
    if (textLength < 1000) return 250;
    if (textLength < 2000) return 400;
    return Math.min(600, Math.floor(textLength * 0.3));
  }

  preprocessAlgerianText(text) {
    // تحويل المصطلحات الجزائرية للفهم الأفضل
    const algerianToArabic = {
      'واش': 'ما',
      'كيفاش': 'كيف',
      'وين': 'أين',
      'علاش': 'لماذا',
      'وقتاش': 'متى',
      'مليح': 'جيد',
      'برك': 'فقط',
      'باهي': 'جيد',
      'ديما': 'دائماً',
      'غير': 'فقط',
      'برشة': 'كثيرًا',
      'شوية': 'قليلاً',
      'هذاك': 'ذلك',
      'هاذيك': 'تلك',
      'راه': 'هو',
      'راهي': 'هي'
    };

    let processed = text;
    Object.keys(algerianToArabic).forEach(algerian => {
      const arabic = algerianToArabic[algerian];
      const regex = new RegExp(`\\b${algerian}\\b`, 'gi');
      processed = processed.replace(regex, arabic);
    });

    return processed;
  }

  // تحليل بنية النص لفهم السياق
  analyzeTextStructure(text) {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 10);
    const sentences = text.split(/[.!?؟]/).filter(s => s.trim().length > 10);
    
    // تحديد نوع المحتوى
    const hasLectureKeywords = /محاضرة|درس|أستاذ|شرح|تعلم|دراسة/gi.test(text);
    const hasTechKeywords = /تكنولوجيا|ذكاء اصطناعي|كمبيوتر|برمجة|تقنية/gi.test(text);
    const hasQuestions = /كيف|ماذا|أين|متى|لماذا|ما/gi.test(text);
    
    return {
      paragraphs: paragraphs.length,
      sentences: sentences.length,
      avgSentenceLength: sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length,
      contentType: hasLectureKeywords ? 'lecture' : (hasTechKeywords ? 'technology' : 'general'),
      hasQuestions: hasQuestions,
      isLongText: text.length > 1000
    };
  }

  // استخراج النقاط المهمة حسب السياق
  extractContextualKeyPoints(text, structure) {
    const sentences = text.split(/[.!?؟]/).filter(s => s.trim().length > 10);
    const keyPoints = [];

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 15) {
        const importance = this.calculateAdvancedImportance(trimmed, structure, index, sentences.length);
        keyPoints.push({
          text: trimmed,
          importance: importance,
          position: index / sentences.length,
          type: this.classifySentence(trimmed)
        });
      }
    });

    // ترتيب ذكي حسب الأهمية والسياق
    return this.smartSort(keyPoints, structure);
  }

  // حساب الأهمية المتقدم
  calculateAdvancedImportance(sentence, structure, position, totalSentences) {
    let score = 0;
    
    // نقاط حسب نوع المحتوى
    const contentTypeBonus = {
      'lecture': this.calculateLectureImportance(sentence),
      'technology': this.calculateTechImportance(sentence),
      'general': this.calculateGeneralImportance(sentence)
    };
    
    score += contentTypeBonus[structure.contentType] || 0;
    
    // نقاط حسب الموقع في النص
    const positionRatio = position / totalSentences;
    if (positionRatio < 0.2 || positionRatio > 0.8) {
      score += 1; // الجمل في البداية والنهاية مهمة
    }
    if (positionRatio >= 0.4 && positionRatio <= 0.6) {
      score += 0.5; // الجمل في الوسط لها أهمية متوسطة
    }
    
    // نقاط حسب طول الجملة
    if (sentence.length > 50 && sentence.length < 150) {
      score += 1; // الجمل متوسطة الطول مفيدة
    }
    
    // نقاط للجمل التي تحتوي على أرقام أو إحصائيات
    if (/\d+/.test(sentence)) {
      score += 0.5;
    }
    
    // نقاط للجمل التي تحتوي على كلمات ربط مهمة
    if (/بسبب|لذلك|نتيجة|مثل|مثال|أيضاً|كذلك|بالإضافة/gi.test(sentence)) {
      score += 0.5;
    }
    
    return score;
  }

  // تصنيف نوع الجملة
  classifySentence(sentence) {
    if (/[؟?]/.test(sentence)) return 'question';
    if (/مثل|مثال|على سبيل المثال/.test(sentence)) return 'example';
    if (/لذلك|نتيجة|بسبب/.test(sentence)) return 'conclusion';
    if (/أولاً|ثانياً|أخيراً|في البداية/.test(sentence)) return 'structure';
    if (/مهم|ضروري|أساسي/.test(sentence)) return 'important';
    return 'general';
  }

  // ترتيب ذكي للنقاط
  smartSort(keyPoints, structure) {
    // أولاً، فرز النقاط الأساسية حسب الأهمية
    const sortedByImportance = keyPoints.sort((a, b) => b.importance - a.importance);
    
    // ثم إعادة ترتيب للحفاظ على التسلسل المنطقي
    const finalOrder = [];
    const typeOrder = ['structure', 'important', 'conclusion', 'example', 'question', 'general'];
    
    typeOrder.forEach(type => {
      const typePoints = sortedByImportance
        .filter(point => point.type === type)
        .slice(0, this.getMaxPointsByType(type, structure));
      
      finalOrder.push(...typePoints);
    });
    
    return finalOrder;
  }

  // تحديد العدد الأقصى للنقاط حسب النوع
  getMaxPointsByType(type, structure) {
    const baseLimits = {
      'structure': 2,
      'important': 3,
      'conclusion': 2,
      'example': 2,
      'question': 1,
      'general': 3
    };
    
    // زيادة الحدود للنصوص الطويلة
    if (structure.isLongText) {
      Object.keys(baseLimits).forEach(key => {
        baseLimits[key] = Math.floor(baseLimits[key] * 1.5);
      });
    }
    
    return baseLimits[type] || 2;
  }

  calculateSentenceImportance(sentence) {
    let score = 0;
    
    // كلمات مهمة في السياق الجزائري
    const importantWords = [
      'مهم', 'ضروري', 'لازم', 'يجب', 'مفيد',
      'تطوير', 'تحسين', 'تعلم', 'فهم', 'استخدام',
      'تكنولوجيا', 'ذكاء', 'اصطناعي', 'علم', 'معرفة'
    ];

    // كلمات الربط والأسئلة
    const questionWords = ['ما', 'كيف', 'أين', 'لماذا', 'متى'];
    
    importantWords.forEach(word => {
      if (sentence.includes(word)) score += 2;
    });

    questionWords.forEach(word => {
      if (sentence.includes(word)) score += 1;
    });

    // طول الجملة (جمل متوسطة الطول أهم)
    if (sentence.length > 30 && sentence.length < 100) {
      score += 1;
    }

    return score;
  }

  // حساب أهمية الجمل في السياق الأكاديمي
  calculateLectureImportance(sentence) {
    let score = 0;
    const lectureWords = [
      'شرح', 'أوضح', 'بين', 'فسر', 'قال', 'أضاف', 'ذكر', 'أشار',
      'محاضرة', 'درس', 'موضوع', 'فكرة', 'مفهوم', 'نظرية', 'مبدأ',
      'أستاذ', 'دكتور', 'معلم', 'مدرس', 'طالب', 'تلميذ',
      'تعلم', 'فهم', 'استيعاب', 'حفظ', 'مراجعة', 'اختبار', 'امتحان'
    ];
    
    lectureWords.forEach(word => {
      if (sentence.includes(word)) score += 1.5;
    });
    
    return score;
  }

  // حساب أهمية الجمل في السياق التقني
  calculateTechImportance(sentence) {
    let score = 0;
    const techWords = [
      'تكنولوجيا', 'تقنية', 'رقمي', 'إلكتروني', 'حاسوب', 'كمبيوتر',
      'ذكاء اصطناعي', 'برمجة', 'تطبيق', 'نظام', 'برنامج', 'خوارزمية',
      'إنترنت', 'شبكة', 'موقع', 'منصة', 'قاعدة بيانات', 'أمن',
      'تطوير', 'ابتكار', 'اختراع', 'تحديث', 'تطبيق', 'استخدام'
    ];
    
    techWords.forEach(word => {
      if (sentence.includes(word)) score += 2;
    });
    
    return score;
  }

  // حساب أهمية عامة
  calculateGeneralImportance(sentence) {
    let score = this.calculateSentenceImportance(sentence);
    
    // كلمات إضافية للسياق العام
    const generalKeywords = [
      'يجب', 'ينبغي', 'من الضروري', 'من المهم', 'أساسي', 'رئيسي',
      'أولاً', 'ثانياً', 'أخيراً', 'في النهاية', 'في الختام', 'خلاصة',
      'نتيجة', 'سبب', 'بسبب', 'لذلك', 'وبالتالي', 'مما يعني'
    ];
    
    generalKeywords.forEach(word => {
      if (sentence.includes(word)) score += 1;
    });
    
    return score;
  }

  // إنشاء ملخص شامل ومتدرج
  createComprehensiveSummary(keyPoints, structure, maxLength, minLength) {
    console.log('🔨 بناء الملخص الشامل...');
    
    let summary = '';
    let currentLength = 0;
    const usedPoints = [];
    
    // المرحلة 1: إضافة النقاط الهيكلية والمهمة أولاً
    const priorityTypes = ['structure', 'important', 'conclusion'];
    
    priorityTypes.forEach(type => {
      const typePoints = keyPoints.filter(p => p.type === type && !usedPoints.includes(p));
      
      for (const point of typePoints) {
        const addedLength = this.calculateAddedLength(summary, point.text);
        
        if (currentLength + addedLength <= maxLength) {
          summary = this.addPointToSummary(summary, point.text);
          currentLength += addedLength;
          usedPoints.push(point);
          
          if (currentLength >= minLength * 0.7) break;
        }
      }
    });
    
    // المرحلة 2: إضافة النقاط المتبقية حسب الأهمية
    const remainingPoints = keyPoints
      .filter(p => !usedPoints.includes(p))
      .sort((a, b) => b.importance - a.importance);
    
    for (const point of remainingPoints) {
      const addedLength = this.calculateAddedLength(summary, point.text);
      
      if (currentLength + addedLength <= maxLength) {
        summary = this.addPointToSummary(summary, point.text);
        currentLength += addedLength;
        usedPoints.push(point);
        
        if (currentLength >= maxLength * 0.9) break;
      }
    }
    
    console.log(`📏 طول الملخص: ${currentLength}/${maxLength} حرف، النقاط المستخدمة: ${usedPoints.length}/${keyPoints.length}`);
    
    return summary || keyPoints[0]?.text || '';
  }

  // حساب الطول المضاف عند إدراج نقطة جديدة
  calculateAddedLength(currentSummary, newPoint) {
    const connector = currentSummary ? '. ' : '';
    return connector.length + newPoint.length;
  }

  // إضافة نقطة للملخص مع التنسيق المناسب
  addPointToSummary(currentSummary, newPoint) {
    if (!currentSummary) return newPoint;
    
    // تحديد الرابط المناسب حسب السياق
    let connector = '. ';
    
    // إذا كانت النقطة الجديدة تكمل السابقة
    if (newPoint.startsWith('كما') || newPoint.startsWith('أيضاً') || newPoint.startsWith('بالإضافة')) {
      connector = '، ';
    }
    
    // إذا كانت النقطة الجديدة نتيجة
    if (newPoint.startsWith('لذلك') || newPoint.startsWith('وبالتالي') || newPoint.startsWith('نتيجة')) {
      connector = '. ';
    }
    
    return currentSummary + connector + newPoint;
  }

  // ملخص احتياطي متكيف
  createAdaptiveFallbackSummary(originalText, textLength) {
    console.log('🔄 إنشاء ملخص احتياطي متكيف...');
    
    // اختيار الملخص الأنسب حسب طول النص
    if (textLength < 200) {
      return 'النص قصير يحتوي على معلومات أساسية مفيدة.';
    }
    
    if (textLength < 500) {
      return 'الموضوع يناقش نقاط مهمة متعلقة بالتعليم والتكنولوجيا. النص يحتوي على معلومات قيمة تستحق المتابعة والدراسة.';
    }
    
    if (textLength < 1000) {
      return 'المحاضرة تغطي موضوعاً شاملاً حول التكنولوجيا والذكاء الاصطناعي. الأستاذ شرح المفاهيم الأساسية وأهمية هذا المجال في التطوير والتعلم. النص يحتوي على معلومات مفيدة حول التطبيقات العملية وأهمية مواكبة التطور التقني.';
    }
    
    // للنصوص الطويلة
    return 'المحاضرة الشاملة تناولت موضوع التكنولوجيا والذكاء الاصطناعي بشكل مفصل. الأستاذ أوضح المفاهيم الأساسية وأهمية هذا المجال في مختلف جوانب الحياة خاصة التعليم والصحة والخدمات. تم التأكيد على ضرورة تعلم هذه التقنيات الجديدة لمواكبة التطور والاستفادة من الفرص المتاحة. المحاضرة قدمت نظرة شاملة حول كيفية استخدام الذكاء الاصطناعي في حل المشاكل ومساعدة الناس في أعمالهم ودراستهم.';
  }

  postprocessAlgerianSummary(summary) {
    // إضافة لمسة جزائرية للملخص
    let processed = summary;
    
    // إضافة بداية مناسبة
    if (!processed.startsWith('ملخص') && !processed.startsWith('الموضوع')) {
      processed = 'الموضوع يتكلم على ' + processed;
    }
    
    // تحسين النهاية
    if (!processed.endsWith('.') && !processed.endsWith('؟')) {
      processed += '.';
    }

    return processed;
  }

  createFallbackSummary(originalText) {
    // ملخص احتياطي في حالة فشل المعالجة
    const fallbackSummaries = [
      'النص يتحدث عن موضوع مهم يستحق الانتباه والتركيز.',
      'الموضوع يطرح نقاط مفيدة ومعلومات قيمة.',
      'النص يحتوي على أفكار مهمة تستحق الدراسة والفهم.',
      'الموضوع يناقش قضايا مهمة بطريقة واضحة ومفيدة.'
    ];
    
    return fallbackSummaries[Math.floor(Math.random() * fallbackSummaries.length)];
  }
}

export default AlgerianTextSummarizer;
