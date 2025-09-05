
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
    const maxLength = options.maxLength || 100;
    const minLength = options.minLength || 30;
    
    try {
      // معالجة النص الجزائري قبل التلخيص
      const processedText = this.preprocessAlgerianText(text);
      
      // استخراج النقاط المهمة
      const keyPoints = this.extractKeyPoints(processedText);
      
      // إنشاء الملخص
      const summary = this.createSummary(keyPoints, maxLength, minLength);
      
      return this.postprocessAlgerianSummary(summary);
      
    } catch (error) {
      console.error('خطأ في تلخيص النص الجزائري:', error);
      return this.createFallbackSummary(text);
    }
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

  extractKeyPoints(text) {
    const sentences = text.split(/[.!?؟]/);
    const keyPoints = [];

    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 10) {
        const importance = this.calculateSentenceImportance(trimmed);
        keyPoints.push({
          text: trimmed,
          importance: importance
        });
      }
    });

    // ترتيب حسب الأهمية
    return keyPoints.sort((a, b) => b.importance - a.importance);
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

  createSummary(keyPoints, maxLength, minLength) {
    let summary = '';
    let currentLength = 0;

    for (const point of keyPoints) {
      if (currentLength + point.text.length <= maxLength) {
        if (summary) summary += '. ';
        summary += point.text;
        currentLength += point.text.length;
        
        if (currentLength >= minLength) {
          break;
        }
      }
    }

    return summary || keyPoints[0]?.text || '';
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
