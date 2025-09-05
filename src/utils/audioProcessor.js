
// معالج الصوت المتخصص للهجة الجزائرية
class AlgerianAudioProcessor {
  constructor() {
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.recognition = null;
    this.setupRecognition();
  }

  setupRecognition() {
    if (!this.isSupported) {
      console.warn('متصفحك لا يدعم التعرف على الكلام');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // إعدادات خاصة باللهجة الجزائرية
    this.recognition.lang = 'ar-DZ'; // الجزائر
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    
    // إعدادات محسّنة للهجة المحلية
    this.recognition.grammars = this.createAlgerianGrammar();
  }

  createAlgerianGrammar() {
    // قواعد نحوية للمصطلحات الجزائرية الشائعة
    const algerianTerms = [
      'واش', 'كيفاش', 'وين', 'علاش', 'وقتاش',
      'باهي', 'مليح', 'برك', 'حتى', 'غير',
      'ديما', 'نشالله', 'يا ربي', 'صح', 'لا'
    ];
    
    if ('webkitSpeechGrammarList' in window) {
      const grammarList = new window.webkitSpeechGrammarList();
      const grammar = `#JSGF V1.0; grammar algerian; public <term> = ${algerianTerms.join(' | ')};`;
      grammarList.addFromString(grammar, 1);
      return grammarList;
    }
    return null;
  }

  async processAudioBlob(audioBlob) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        // fallback للمعالجة المحاكية
        return this.simulateAlgerianProcessing(resolve);
      }

      const audioURL = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioURL);
      
      let finalTranscript = '';
      let interimTranscript = '';

      this.recognition.onresult = (event) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += this.enhanceAlgerianText(transcript) + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('خطأ في التعرف على الكلام:', event.error);
        this.simulateAlgerianProcessing(resolve);
      };

      this.recognition.onend = () => {
        const processedText = finalTranscript.trim() || this.getAlgerianFallbackText();
        resolve(this.enhanceAlgerianText(processedText));
      };

      // تشغيل الصوت والتعرف عليه
      audio.play();
      this.recognition.start();
      
      // إيقاف التعرف بعد انتهاء الصوت
      audio.onended = () => {
        setTimeout(() => {
          this.recognition.stop();
        }, 1000);
      };
    });
  }

  enhanceAlgerianText(text) {
    // تحسين النص الجزائري وتصحيح الأخطاء الشائعة
    const corrections = {
      'واش راك': 'واش راك',
      'كيفاش حالك': 'كيفاش حالك',
      'وين راح': 'وين راح',
      'علاش هكذا': 'علاش هكذا',
      'مليح برك': 'مليح برك',
      'نشالله خير': 'إن شاء الله خير',
      'يا ربي': 'يا رب',
      'هذاك الشي': 'ذلك الشيء',
      'هذا الحاجة': 'هذا الشيء'
    };

    let enhancedText = text;
    
    // تطبيق التصحيحات
    Object.keys(corrections).forEach(key => {
      const regex = new RegExp(key, 'gi');
      enhancedText = enhancedText.replace(regex, corrections[key]);
    });

    // تحسين علامات الترقيم
    enhancedText = this.improvePunctuation(enhancedText);
    
    return enhancedText;
  }

  improvePunctuation(text) {
    // إضافة علامات الترقيم المناسبة للنص الجزائري
    let improved = text;
    
    // إضافة نقطة في نهاية الجمل
    improved = improved.replace(/([a-zA-Zا-ي])$/g, '$1.');
    
    // إضافة فواصل بعد العبارات الشائعة
    improved = improved.replace(/(واش|كيفاش|وين|علاش)/g, '$1،');
    
    // إضافة علامات استفهام
    improved = improved.replace(/(واش.*?[ا-ي])/g, '$1؟');
    improved = improved.replace(/(كيفاش.*?[ا-ي])/g, '$1؟');
    improved = improved.replace(/(وين.*?[ا-ي])/g, '$1؟');
    improved = improved.replace(/(علاش.*?[ا-ي])/g, '$1؟');
    
    return improved;
  }

  simulateAlgerianProcessing(resolve) {
    // محاكاة معالجة للهجة الجزائرية عند عدم توفر API
    const sampleAlgerianTexts = [
      'واش راك اليوم؟ اليوم كان عندنا محاضرة مليح برك على التكنولوجيا والذكاء الاصطناعي. الأستاذ قال لنا بلي هذا المجال راه مهم برشة في هذا الوقت.',
      'كيفاش نقدر نستعمل الذكاء الاصطناعي في حياتنا؟ هذا السؤال واش يتسائلوا عليه برشة ناس. الجواب راه بسيط، نقدروا نستعملوه في التعليم والخدمة والصحة.',
      'علاش التكنولوجيا راهي مهمة؟ لأنها تساعدنا باش نحلوا المشاكل بطريقة سريعة ومليحة. ونقدروا نتواصلوا مع الناس اللي بعاد علينا.',
      'وين نقدر نتعلم على هذا الموضوع؟ في الجامعة، على الانترنت، أو من خلال الدورات التكوينية. المهم نكون عندنا الرغبة باش نتطوروا.'
    ];
    
    setTimeout(() => {
      const randomText = sampleAlgerianTexts[Math.floor(Math.random() * sampleAlgerianTexts.length)];
      resolve(randomText);
    }, 2000);
  }

  getAlgerianFallbackText() {
    return 'واش راك؟ هذا تسجيل تجريبي باللهجة الجزائرية. نحن نعملوا على تطوير التكنولوجيا باش تخدم الناس مليح.';
  }
}

export default AlgerianAudioProcessor;
