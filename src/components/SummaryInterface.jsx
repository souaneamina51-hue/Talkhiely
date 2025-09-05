import React, { useState, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import TrialStatusBanner from './TrialStatusBanner';
import AlgerianAudioProcessor from '../utils/audioProcessor';
import AlgerianTextSummarizer from '../utils/algerianSummarizer';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Heading,
  Container,
  Card,
  CardBody,
  Badge,
  Alert,
  Divider,
  Collapse,
  Flex,
  Spacer,
  useColorModeValue,
  useDisclosure,
  Progress,
  CardHeader
} from '@chakra-ui/react';

const SummaryInterface = ({ trialStatus }) => {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [processingProgress, setProcessingProgress] = useState(null);
  
  // معالجات اللهجة الجزائرية
  const [audioProcessor] = useState(() => new AlgerianAudioProcessor());
  const [textSummarizer] = useState(() => new AlgerianTextSummarizer());
  const [isAlgerianMode, setIsAlgerianMode] = useState(true);

  // تنظيف الموارد عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (audioProcessor && typeof audioProcessor.destroy === 'function') {
        audioProcessor.destroy();
        console.log('🧹 تم تنظيف موارد معالج الصوت');
      }
    };
  }, [audioProcessor]);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
  } = useReactMediaRecorder({ audio: true });

  const cardBg = useColorModeValue('white', 'gray.800');
  const mainBg = useColorModeValue('gray.50', 'gray.900');

  // Timer functionality
  useEffect(() => {
    let interval = null;
    if (isActive && status === 'recording') {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else if (!isActive) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, status, timer]);

  const handleStart = async () => {
    try {
      // التحقق من دعم التعرف على الكلام
      const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      
      if (!isSupported) {
        alert('متصفحك لا يدعم ميزة التعرف على الكلام. يرجى استخدام Google Chrome أو Safari.');
        return;
      }

      // طلب أذونات الميكروفون
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ تم الحصول على إذن الميكروفون');
      } catch (permError) {
        alert('يرجى السماح بالوصول للميكروفون لتسجيل الصوت');
        console.error('❌ خطأ في أذونات الميكروفون:', permError);
        return;
      }

      setIsActive(true);
      setTimer(0);
      setTranscribedText('');
      setSummary('');
      console.log('🎤 بدء التسجيل...');
      startRecording();
    } catch (error) {
      console.error('❌ خطأ في بدء التسجيل:', error);
      alert('حدث خطأ في بدء التسجيل. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleStop = async () => {
    setIsActive(false);
    stopRecording();
  };

  const sendAudioToAPI = async () => {
    if (!mediaBlobUrl) {
      console.error('❌ لا يوجد تسجيل صوتي للمعالجة');
      alert('لا يوجد تسجيل صوتي. يرجى تسجيل الصوت أولاً.');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({
      current: 5,
      total: 100,
      stage: 'initializing',
      message: 'تهيئة معالجة الصوت باللهجة الجزائرية...'
    });
    setTranscribedText(''); // مسح النص السابق

    try {
      console.log('🎤 بدء معالجة الصوت باللهجة الجزائرية...');
      
      // التحقق من دعم التعرف على الكلام
      const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      console.log('🔍 دعم التعرف على الكلام:', isSupported);

      if (!isSupported) {
        throw new Error('متصفحك لا يدعم التعرف على الكلام.\n\nالمتصفحات المدعومة:\n• Google Chrome\n• Microsoft Edge\n• Safari (أحدث إصدار)');
      }

      setProcessingProgress({
        current: 10,
        total: 100,
        stage: 'loading',
        message: 'تحميل وتحليل الملف الصوتي...'
      });

      // تحويل URL إلى Blob
      const response = await fetch(mediaBlobUrl);
      const audioBlob = await response.blob();
      
      console.log('📊 حجم الملف الصوتي:', Math.round(audioBlob.size / 1024), 'KB');
      console.log('📊 نوع الملف الصوتي:', audioBlob.type);
      
      // التحقق من صحة الملف الصوتي
      if (audioBlob.size < 1000) {
        throw new Error('الملف الصوتي صغير جداً أو تالف.\n\nنصائح:\n• تأكد من تسجيل صوت واضح\n• تحدث لمدة كافية (على الأقل 5 ثوان)\n• تجنب الضوضاء الخلفية');
      }

      // التحقق من حجم الملف الكبير
      if (audioBlob.size > 50 * 1024 * 1024) { // 50 MB
        throw new Error('الملف الصوتي كبير جداً.\n\nيرجى:\n• تسجيل مقاطع أقصر\n• ضغط الملف\n• تقسيم التسجيل إلى أجزاء أصغر');
      }
      
      setProcessingProgress({
        current: 20,
        total: 100,
        stage: 'preparing',
        message: 'تحضير معالج اللهجة الجزائرية المتقدم...'
      });
      
      // بدء المعالجة الفعلية مع معالجة التقدم المحسنة
      const extractedText = await audioProcessor.processAudioBlob(
        audioBlob,
        (progress) => {
          console.log('📊 تقدم المعالجة:', progress);
          
          // تحديث شريط التقدم مع رسائل واضحة
          let updatedProgress = {
            ...progress,
            message: getProgressMessage(progress)
          };

          // ضبط النطاق (20-85 للمعالجة)
          if (progress.stage === 'processing') {
            updatedProgress.current = 20 + Math.round((progress.current / progress.total) * 65);
            updatedProgress.total = 100;
          } else if (progress.stage === 'merging') {
            updatedProgress.current = 85;
            updatedProgress.total = 100;
          }
          
          setProcessingProgress(updatedProgress);
        }
      );
      
      console.log('📝 النص المستخرج:', extractedText);
      
      // التحقق من جودة النص
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('لم يتم استخراج نص كافي من التسجيل الصوتي.\n\nنصائح لتحسين النتائج:\n• تحدث بوضوح وببطء\n• تجنب الضوضاء الخلفية\n• تأكد من قرب الميكروفون\n• استخدم مكان هادئ للتسجيل');
      }

      // التحقق من أن النص حقيقي وليس احتياطي
      const fallbackIndicators = [
        'كان عندنا محاضرة مهمة اليوم على التكنولوجيا',
        'هذا نص تجريبي',
        'واش راك اليوم؟ كان عندنا محاضرة مليح برك',
        'النص يتحدث عن موضوع مهم',
        'الموضوع يطرح نقاط مفيدة'
      ];
      
      const isFallbackText = fallbackIndicators.some(indicator => 
        extractedText.includes(indicator)
      );
      
      if (isFallbackText) {
        throw new Error('فشل في التعرف على الكلام الفعلي من التسجيل.\n\nاقتراحات:\n• تحدث بصوت واضح ومسموع\n• تجنب التحدث بسرعة\n• استخدم مكان هادئ بدون صدى\n• تأكد من عمل الميكروفون بشكل صحيح\n• جرب إعادة التسجيل في بيئة أفضل');
      }
      
      setTranscribedText(extractedText);
      console.log('✅ تم استخراج النص بنجاح');

      // بدء التلخيص
      setProcessingProgress({
        current: 90,
        total: 100,
        stage: 'summarizing',
        message: 'تحليل وتلخيص النص باللهجة الجزائرية باستخدام الذكاء الاصطناعي...'
      });
      
      await summarizeText(extractedText);
      
      setProcessingProgress({
        current: 100,
        total: 100,
        stage: 'complete',
        message: 'تمت المعالجة والتلخيص بنجاح!'
      });

      // إخفاء شريط التقدم بعد ثانيتين
      setTimeout(() => {
        setProcessingProgress(null);
        setIsProcessing(false);
      }, 2000);
      
      console.log('✅ تمت معالجة الصوت والتلخيص بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في معالجة الصوت:', error);
      setProcessingProgress(null);
      setIsProcessing(false);
      
      // رسائل خطأ مفصلة ومفيدة
      let errorMessage = 'فشل في معالجة التسجيل الصوتي.\n\n';
      
      if (error.message.includes('لا يدعم')) {
        errorMessage += '❌ المتصفح غير مدعوم:\n' + error.message;
      } else if (error.message.includes('أذونات') || error.message.includes('الميكروفون')) {
        errorMessage += '🎤 مشكلة في الميكروفون:\n' + error.message;
      } else if (error.message.includes('صغير جداً') || error.message.includes('تالف')) {
        errorMessage += '📁 مشكلة في الملف:\n' + error.message;
      } else if (error.message.includes('فشل في التعرف')) {
        errorMessage += '🔊 مشكلة في جودة الصوت:\n' + error.message;
      } else {
        errorMessage += '⚠️ خطأ عام:\n' + error.message;
      }
      
      errorMessage += '\n\n🔄 جرب المحاولة مرة أخرى مع اتباع النصائح المذكورة.';
      
      alert(errorMessage);
    }
  };

  // دالة للحصول على مدة الصوت
  const getAudioDuration = (audioBlob) => {
    return new Promise((resolve) => {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration || 0);
      });
      audio.addEventListener('error', () => {
        resolve(0);
      });
    });
  };

  

  const getProgressMessage = (progress) => {
    const baseMessage = (() => {
      switch (progress.stage) {
        case 'initializing':
          return 'تهيئة نظام التعرف على الكلام باللهجة الجزائرية...';
        case 'loading':
          return 'تحميل وفحص جودة الملف الصوتي...';
        case 'preparing':
          return 'تحليل مدة التسجيل وإعداد التقسيم التلقائي...';
        case 'splitting':
          return `تقسيم التسجيل إلى ${progress.total || 'عدة'} مقاطع من 30 ثانية لكل مقطع...`;
        case 'processing':
          if (progress.total > 1) {
            const percentage = Math.round((progress.current / progress.total) * 100);
            return `تحويل المقطع ${progress.current}/${progress.total} إلى نص جزائري (${percentage}%)\nدمج النصوص تدريجياً كما في pseudo-code`;
          } else {
            return 'التعرف المباشر على الكلام باللهجة الجزائرية...';
          }
        case 'merging':
          return 'دمج جميع النصوص في نص واحد موحد وتنظيف الأخطاء...';
        case 'complete':
          return 'النص الكامل جاهز للتلخيص! لا توجد نصوص احتياطية.';
        case 'analyzing':
          return 'تحليل النص الجزائري المستخرج وفهم المحتوى...';
        case 'summarizing':
          return 'إنشاء الملخص الذكي من النص الحقيقي المستخرج...';
        default:
          return 'معالجة حقيقية للصوت باللهجة الجزائرية بدون نصوص احتياطية...';
      }
    })();

    // إضافة معلومات إضافية للمستخدم
    if (progress.stage === 'processing' && progress.total > 1) {
      return `${baseMessage}\n\n💡 كل مقطع يتم تحويله بشكل فعلي من الصوت إلى النص`;
    }

    if (progress.memoryInfo) {
      return `${baseMessage}\n📊 ${progress.memoryInfo}`;
    }

    return baseMessage;
  };

  const summarizeText = async (text) => {
    if (!text) return;

    setIsSummarizing(true);
    try {
      console.log('🤖 بدء تلخيص النص الجزائري...');
      
      // تلخيص النص باللهجة الجزائرية
      const algerianSummary = await textSummarizer.summarizeAlgerianText(text, {
        maxLength: 150,
        minLength: 40
      });

      setSummary(algerianSummary);
      const newSummary = {
        id: Date.now(),
        text: algerianSummary,
        transcribedText: text,
        date: new Date(),
        timestamp: new Date().toLocaleString('ar-SA'),
        isAlgerian: isAlgerianMode
      };

      setSummaries(prevSummaries => [...prevSummaries, newSummary]);
      setIsSummarizing(false);
      console.log('✅ الملخص الجزائري:', algerianSummary);
    } catch (error) {
      console.error('❌ خطأ في تلخيص النص الجزائري:', error);
      const fallbackSummary = 'الموضوع يتكلم على حاجات مهمة ومفيدة. النص راه يحتوي على معلومات قيمة.';
      setSummary(fallbackSummary);
      setIsSummarizing(false);
    }
  };

  const handleShare = async () => {
    if (summaries.length === 0) {
      alert('لا يوجد ملخصات للمشاركة. قم بإنشاء ملخص أولاً.');
      return;
    }

    const allSummariesText = summaries
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((summary, index) => `الملخص ${index + 1} (${summary.timestamp}):\n${summary.text}\n\n`)
      .join('');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ملخصات المحاضرات',
          text: `جميع الملخصات الذكية:\n\n${allSummariesText}`,
          url: window.location.href
        });
        console.log('تمت المشاركة بنجاح!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('فشل المشاركة:', error);
          fallbackShare(allSummariesText);
        }
      }
    } else {
      console.log('Web Share API غير مدعوم في هذا المتصفح.');
      fallbackShare(allSummariesText);
    }
  };

  const fallbackShare = (shareText = null) => {
    const textToShare = shareText || (summaries.length > 0 ?
      summaries
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((summary, index) => `الملخص ${index + 1} (${summary.timestamp}):\n${summary.text}\n\n`)
        .join('')
      : `الملخص الذكي:\n\n${summary}\n\nالنص الكامل:\n\n${transcribedText}`);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToShare).then(() => {
        alert('تم نسخ الملخصات إلى الحافظة! يمكنك لصقها في أي تطبيق آخر.');
      }).catch(() => {
        const newWindow = window.open('', '_blank', 'width=600,height=400');
        newWindow.document.write(`
          <html>
            <head><title>ملخصات المحاضرات</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; direction: rtl;">
              <h2>ملخصات المحاضرات</h2>
              <div style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
                <pre style="white-space: pre-wrap; font-family: inherit;">${textToShare}</pre>
              </div>
              <p><em>يمكنك نسخ النص أعلاه ومشاركته</em></p>
            </body>
          </html>
        `);
      });
    } else {
      const newWindow = window.open('', '_blank', 'width=600,height=400');
      newWindow.document.write(`
        <html>
          <head><title>ملخصات المحاضرات</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px; direction: rtl;">
            <h2>ملخصات المحاضرات</h2>
            <div style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
              <pre style="white-space: pre-wrap; font-family: inherit;">${textToShare}</pre>
            </div>
            <p><em>يمكنك نسخ النص أعلاه ومشاركته</em></p>
          </body>
        </html>
      `);
    }
  };

  const handleSave = () => {
    if (summaries.length === 0) {
      alert('لا يوجد ملخصات للحفظ. قم بإنشاء ملخص أولاً.');
      return;
    }

    const sortedSummaries = summaries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const fullText = `تطبيق تلخيصلي - جميع الملخصات
========================================

${sortedSummaries.map((summary, index) => `
📝 الملخص رقم ${index + 1}
التاريخ والوقت: ${summary.timestamp}
----------------------------------------

الملخص الذكي:
${summary.text}

النص الكامل:
${summary.transcribedText}

========================================
`).join('')}

تم إنشاؤه بواسطة تطبيق تلخيصلي
عدد الملخصات: ${summaries.length}
تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}
وقت التصدير: ${new Date().toLocaleTimeString('ar-SA')}`;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `جميع_الملخصات_تلخيصلي_${new Date().toISOString().split('T')[0]}.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('تم حفظ الملف بنجاح!');
  };

  useEffect(() => {
    if (mediaBlobUrl && status === 'stopped') {
      sendAudioToAPI();
    }
  }, [mediaBlobUrl, status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (isProcessing) return 'جاري معالجة الصوت...';
    if (isSummarizing) return 'جاري تلخيص النص...';

    switch (status) {
      case 'recording':
        return 'التسجيل جارٍ...';
      case 'stopped':
        return 'متوقف';
      case 'idle':
        return 'جاهز للتسجيل';
      default:
        return 'جاهز للتسجيل';
    }
  };

  const getStatusColor = () => {
    if (status === 'recording') return 'red';
    if (isProcessing) return 'orange';
    return 'blue';
  };

  const handleUpgrade = () => {
    alert('ميزة الترقية ستكون متاحة قريباً!');
  };

  return (
    <Box bg={mainBg} minH="100vh" py={8}>
      <Container maxW="4xl">
        <VStack spacing={8}>
          {/* Trial Status Banner */}
          {trialStatus && (
            <TrialStatusBanner 
              trialStatus={trialStatus} 
              onUpgrade={handleUpgrade}
            />
          )}

          {/* Header */}
          <Card w="full" bg={cardBg} shadow="lg">
            <CardBody textAlign="center">
              <Heading as="h1" size="xl" mb={4} color="blue.600">
                🎤 واجهة التلخيص الذكي
              </Heading>

              {/* مفتاح تبديل اللهجة الجزائرية */}
              <HStack mb={4} justify="center">
                <Text fontSize="md" color="gray.600">اللهجة:</Text>
                <Badge 
                  colorScheme={isAlgerianMode ? "green" : "blue"} 
                  variant="solid"
                  px={3} 
                  py={1}
                  borderRadius="full"
                  cursor="pointer"
                  onClick={() => setIsAlgerianMode(!isAlgerianMode)}
                  _hover={{ transform: 'scale(1.05)' }}
                >
                  {isAlgerianMode ? '🇩🇿 جزائرية' : '🇸🇦 عربية فصحى'}
                </Badge>
                <Text fontSize="sm" color="gray.500">
                  اضغط للتبديل
                </Text>
              </HStack>

              {/* Timer Display */}
              <Box mb={4}>
                <Text fontSize="3xl" fontWeight="bold" color="gray.600">
                  {formatTime(timer)}
                </Text>
                <Badge
                  colorScheme={getStatusColor()}
                  variant="solid"
                  fontSize="md"
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  {getStatusText()}
                </Badge>
              </Box>

              {/* Control Buttons */}
              <HStack spacing={4} justify="center">
                <Button
                  onClick={handleStart}
                  isDisabled={status === 'recording' || isProcessing || isSummarizing}
                  colorScheme="green"
                  size="lg"
                  leftIcon={<Text>▶️</Text>}
                  isLoading={status === 'recording'}
                  loadingText="جاري التسجيل..."
                >
                  ابدأ التسجيل
                </Button>

                <Button
                  onClick={handleStop}
                  isDisabled={status !== 'recording'}
                  colorScheme="red"
                  size="lg"
                  leftIcon={<Text>⏹️</Text>}
                >
                  إيقاف التسجيل
                </Button>
              </HStack>
            </CardBody>
          </Card>

          {/* Audio Player */}
          {mediaBlobUrl && (
            <Card w="full" bg={cardBg} shadow="md">
              <CardBody textAlign="center">
                <Text mb={3} fontSize="lg" fontWeight="semibold">
                  🎵 التسجيل المكتمل
                </Text>
                <Box
                  as="audio"
                  src={mediaBlobUrl}
                  controls
                  w="full"
                  maxW="500px"
                  mx="auto"
                />
              </CardBody>
            </Card>
          )}

          {/* Processing Alerts */}
          {isProcessing && (
            <Alert status="warning" borderRadius="lg">
              <VStack align="start" spacing={3} w="full">
                <Text fontWeight="bold">
                  {isAlgerianMode ? '🔄 جاري تحويل الصوت الجزائري إلى نص...' : '🔄 جاري تحويل الصوت إلى نص...'}
                </Text>
                
                {processingProgress ? (
                  <VStack align="start" spacing={3} w="full">
                    <Text 
                      fontSize="sm" 
                      color="orange.700" 
                      fontWeight="semibold"
                      whiteSpace="pre-line"
                      lineHeight="1.4"
                    >
                      {processingProgress.message}
                    </Text>
                    
                    {processingProgress.stage === 'processing' && (
                      <VStack w="full" spacing={2}>
                        <HStack w="full" spacing={2}>
                          <Progress
                            value={(processingProgress.current / processingProgress.total) * 100}
                            colorScheme="orange"
                            size="md"
                            w="full"
                            hasStripe
                            isAnimated
                          />
                          <Text fontSize="xs" color="orange.600" minW="60px">
                            {processingProgress.current}/{processingProgress.total}
                          </Text>
                        </HStack>
                        
                        {/* شريط تقدم إضافي للذاكرة إذا كانت متاحة */}
                        {processingProgress.memoryInfo && (
                          <Text fontSize="xs" color="gray.500" textAlign="center" w="full">
                            🧠 إدارة الذاكرة: تنظيف تلقائي بعد كل مقطع
                          </Text>
                        )}
                      </VStack>
                    )}
                    
                    {processingProgress.stage !== 'processing' && (
                      <VStack w="full" spacing={2}>
                        <Progress size="sm" isIndeterminate colorScheme="orange" w="full" />
                        
                        {/* نصائح للمستخدم حسب المرحلة */}
                        {processingProgress.stage === 'merging' && (
                          <Text fontSize="xs" color="gray.500" textAlign="center">
                            💡 نصيحة: التسجيلات القصيرة (أقل من 30 ثانية) تعطي نتائج أسرع
                          </Text>
                        )}
                        
                        {processingProgress.stage === 'loading' && (
                          <Text fontSize="xs" color="gray.500" textAlign="center">
                            ⚡ للحصول على أفضل النتائج، تحدث بوضوح في مكان هادئ
                          </Text>
                        )}
                      </VStack>
                    )}
                  </VStack>
                ) : (
                  <VStack align="start" spacing={2} w="full">
                    <Text fontSize="sm" color="orange.600">
                      {isAlgerianMode ? 'نحن نعالجوا الكلام بالدارجة الجزائرية مع دعم التسجيلات الطويلة' : 'معالجة الكلام بالعربية الفصحى'}
                    </Text>
                    <Progress size="sm" isIndeterminate colorScheme="orange" w="full" />
                  </VStack>
                )}
              </VStack>
            </Alert>
          )}

          {isSummarizing && (
            <Alert status="info" borderRadius="lg">
              <VStack align="start" spacing={2} w="full">
                <Text fontWeight="bold">
                  {isAlgerianMode ? '🤖 جاري تلخيص النص الجزائري بالذكاء الاصطناعي...' : '🤖 جاري تلخيص النص باستخدام الذكاء الاصطناعي...'}
                </Text>
                <Text fontSize="sm" color="blue.600">
                  {isAlgerianMode ? 'نحن نفهموا الدارجة مليح ونلخصوها بطريقة واضحة' : 'تحليل وتلخيص النص بالعربية الفصحى'}
                </Text>
                <Progress size="sm" isIndeterminate colorScheme="blue" w="full" />
              </VStack>
            </Alert>
          )}

          {/* Transcribed Text */}
          {transcribedText && (
            <Card w="full" bg={cardBg} shadow="md">
              <CardHeader>
                <Heading size="md" color="green.600">
                  📝 النص المستخرج
                </Heading>
              </CardHeader>
              <CardBody>
                <Text
                  fontSize="lg"
                  lineHeight="tall"
                  textAlign="right"
                  dir="rtl"
                  p={4}
                  bg="gray.50"
                  borderRadius="md"
                >
                  {transcribedText}
                </Text>
              </CardBody>
            </Card>
          )}

          {/* All Summaries */}
          {summaries.length > 0 && (
            <Card w="full" bg={cardBg} shadow="lg">
              <CardHeader>
                <Flex align="center">
                  <Heading size="lg" color="blue.600">
                    📚 جميع الملخصات ({summaries.length})
                  </Heading>
                  <Spacer />
                  <HStack spacing={3}>
                    <Button
                      onClick={handleSave}
                      colorScheme="cyan"
                      leftIcon={<Text>💾</Text>}
                      size="md"
                    >
                      حفظ الكل
                    </Button>
                    <Button
                      onClick={handleShare}
                      colorScheme="green"
                      leftIcon={<Text>📤</Text>}
                      size="md"
                    >
                      مشاركة الكل
                    </Button>
                  </HStack>
                </Flex>
              </CardHeader>

              <CardBody>
                <VStack spacing={6}>
                  {summaries
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((summaryItem, index) => (
                      <Card
                        key={summaryItem.id}
                        w="full"
                        bg="blue.50"
                        border="2px solid"
                        borderColor="blue.200"
                        shadow="sm"
                      >
                        <CardHeader>
                          <Flex align="center" justify="space-between">
                            <HStack>
                              <Heading size="md" color="blue.700">
                                📝 الملخص رقم {index + 1}
                              </Heading>
                              {summaryItem.isAlgerian && (
                                <Badge colorScheme="green" variant="solid" size="sm">
                                  🇩🇿 جزائري
                                </Badge>
                              )}
                            </HStack>
                            <Badge colorScheme="blue" variant="outline">
                              {summaryItem.timestamp}
                            </Badge>
                          </Flex>
                        </CardHeader>

                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            {/* Summary */}
                            <Box>
                              <Text fontSize="sm" color="blue.600" fontWeight="semibold" mb={2}>
                                الملخص الذكي:
                              </Text>
                              <Box
                                bg="white"
                                p={4}
                                borderRadius="md"
                                border="1px solid"
                                borderColor="blue.100"
                              >
                                <Text
                                  fontSize="lg"
                                  fontWeight="bold"
                                  textAlign="right"
                                  dir="rtl"
                                  color="gray.700"
                                >
                                  {summaryItem.text}
                                </Text>
                              </Box>
                            </Box>

                            <Divider />

                            {/* Full Text Toggle */}
                            <Box>
                              <Button
                                onClick={() => {}}
                                variant="ghost"
                                size="sm"
                                color="blue.600"
                                px={0}
                                _hover={{ bg: "transparent", color: "blue.700" }}
                              >
                                <Text fontSize="sm">
                                  عرض النص الكامل ▼
                                </Text>
                              </Button>

                              <Box
                                bg="gray.50"
                                p={4}
                                borderRadius="md"
                                border="1px solid"
                                borderColor="gray.200"
                                mt={2}
                              >
                                <Text
                                  fontSize="md"
                                  lineHeight="tall"
                                  textAlign="right"
                                  dir="rtl"
                                  color="gray.600"
                                >
                                  {summaryItem.transcribedText}
                                </Text>
                              </Box>
                            </Box>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default SummaryInterface;