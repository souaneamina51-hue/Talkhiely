import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Alert,
  AlertIcon,
  Progress,
  useColorModeValue
} from '@chakra-ui/react';

const AudioRecorder = ({ onNewSummary, onRecordingStateChange, trialStatus }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [processingChunks, setProcessingChunks] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState(0);

  // refs للتحكم في التسجيل والتقسيم
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkTimerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chunkCounterRef = useRef(0);
  const speechRecognitionRef = useRef(null);
  const currentTranscriptionRef = useRef('');

  // إعدادات التقسيم
  const CHUNK_DURATION = 7000; // 7 ثواني لكل مقطع

  const cardBg = useColorModeValue('white', 'gray.800');

  // تنظيف الموارد عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Timer functionality
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // التحقق من دعم المتصفح للميكروفون
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم تسجيل الصوت');
      }

      console.log('🎤 طلب أذونات الميكروفون...');

      // طلب أذونات الميكروفون مع معالجة شاملة للأخطاء
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });

      // التحقق من صحة الـ stream
      if (!stream || !stream.getAudioTracks || stream.getAudioTracks().length === 0) {
        throw new Error('فشل في الحصول على مسار الصوت من الميكروفون');
      }

      streamRef.current = stream;
      console.log('✅ تم الحصول على إذن الميكروفون للتسجيل المتقطع');

      // بدء التعرف على الكلام المباشر
      startSpeechRecognition();

      // إنشاء MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      chunkCounterRef.current = 0;

      // معالج البيانات الواردة
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // معالج توقف التسجيل لكل مقطع
      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          processCurrentChunk();
        }
      };

      // بدء التسجيل
      mediaRecorder.start();
      setIsRecording(true);
      setTimer(0);
      setRecordedChunks(0);
      setProcessingChunks(0);

      // إخبار المكون الأب بتغيير حالة التسجيل
      if (onRecordingStateChange) {
        onRecordingStateChange(true);
      }

      // تشغيل مؤقت التقسيم
      startChunkTimer();

    } catch (error) {
      console.error('❌ خطأ في بدء التسجيل:', error);

      let errorMessage = 'حدث خطأ في بدء التسجيل. ';

      if (error.name === 'NotAllowedError') {
        errorMessage += 'يرجى السماح بالوصول للميكروفون من إعدادات المتصفح.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'لم يتم العثور على ميكروفون. تأكد من توصيل ميكروفون وإعادة المحاولة.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'متصفحك لا يدعم تسجيل الصوت.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'الميكروفون مستخدم من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.';
      } else {
        errorMessage += error.message || 'خطأ غير معروف.';
      }

      alert(errorMessage);
    }
  };

  const startChunkTimer = () => {
    chunkTimerRef.current = setInterval(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        // إيقاف التسجيل الحالي لمعالجة المقطع
        mediaRecorderRef.current.stop();

        // بدء تسجيل مقطع جديد بعد قليل
        setTimeout(() => {
          if (isRecording) {
            const mediaRecorder = new MediaRecorder(streamRef.current, {
              mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
              }
            };

            mediaRecorder.onstop = () => {
              if (audioChunksRef.current.length > 0) {
                processCurrentChunk();
              }
            };

            mediaRecorder.start();
          }
        }, 100);
      }
    }, CHUNK_DURATION);
  };

  const processCurrentChunk = async () => {
    try {
      chunkCounterRef.current += 1;
      const chunkNumber = chunkCounterRef.current;

      setRecordedChunks(chunkNumber);
      setProcessingChunks(prev => prev + 1);

      // إنشاء blob من المقطع الحالي
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      console.log(`🎵 معالجة المقطع رقم ${chunkNumber} - الحجم: ${Math.round(audioBlob.size / 1024)} KB`);

      // إرسال المقطع للمعالجة
      const transcribedText = await transcribeAudioChunk(audioBlob, chunkNumber);

      if (transcribedText && transcribedText.trim()) {
        const summary = await summarizeText(transcribedText, chunkNumber);

        // إرسال النتيجة إلى المكون الأب
        if (onNewSummary && summary) {
          onNewSummary({
            id: `chunk_${Date.now()}_${chunkNumber}`,
            chunkNumber,
            transcription: transcribedText,
            summary,
            timestamp: new Date().toLocaleTimeString('ar-DZ'),
            date: new Date().toISOString()
          });
        }
      }

      setProcessingChunks(prev => prev - 1);

    } catch (error) {
      console.error(`❌ خطأ في معالجة المقطع:`, error);
      setProcessingChunks(prev => prev - 1);
    }
  };

  const transcribeAudioChunk = async (audioBlob, chunkNumber) => {
    try {
      console.log(`🔤 [نقطة تحقق 6أ] بدء تفريغ المقطع رقم ${chunkNumber}:`);
      console.log(`   - حجم البيانات: ${Math.round(audioBlob.size / 1024)} KB`);
      console.log(`   - نوع البيانات: ${audioBlob.type}`);

      // إعداد البيانات للإرسال
      const formData = new FormData();
      formData.append('audio', audioBlob, `chunk_${chunkNumber}.webm`);
      formData.append('language', 'ar-DZ');

      console.log(`📤 [نقطة تحقق 6أ] إرسال الطلب إلى /api/transcribe...`);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      console.log(`📥 [نقطة تحقق 6أ] استجابة الخادم:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [نقطة تحقق 6أ] خطأ HTTP:`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log(`📋 [نقطة تحقق 6أ] نتيجة التفريغ كاملة:`, result);

      if (result.error) {
        console.error(`❌ [نقطة تحقق 6أ] خطأ من الخادم:`, result.error);
        throw new Error(result.error);
      }

      if (result.source === 'openai-whisper') {
        console.log(`✅ [نقطة تحقق 6أ] تم تفريغ المقطع ${chunkNumber} بواسطة OpenAI بنجاح`);
      } else if (result.source === 'fallback') {
        console.log(`⚠️ [نقطة تحقق 6أ] تم تفريغ المقطع ${chunkNumber} بواسطة النظام الاحتياطي`);
      }

      return result.text;

    } catch (error) {
      console.error(`❌ [نقطة تحقق 6أ] خطأ في تفريغ المقطع ${chunkNumber}:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      // إرجاع نص احتياطي بدلاً من رمي الخطأ
      return `خطأ في تفريغ المقطع ${chunkNumber}: ${error.message}`;
    }
  };


  const summarizeText = async (text, chunkNumber) => {
    try {
      console.log(`📝 [نقطة تحقق 6ب] بدء تلخيص المقطع رقم ${chunkNumber}:`);
      console.log(`   - طول النص: ${text.length} حرف`);
      console.log(`   - النص الكامل: "${text}"`);

      const requestBody = {
        text: text,
        language: 'ar-DZ',
        chunkNumber: chunkNumber
      };

      console.log(`📤 [نقطة تحقق 6ب] إرسال الطلب إلى /api/summarize:`, requestBody);

      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 [نقطة تحقق 6ب] استجابة الخادم:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [نقطة تحقق 6ب] خطأ HTTP:`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log(`📋 [نقطة تحقق 6ب] نتيجة التلخيص كاملة:`, result);

      if (result.error) {
        console.error(`❌ [نقطة تحقق 6ب] خطأ من الخادم:`, result.error);
        throw new Error(result.error);
      }

      if (result.source === 'openai-gpt') {
        console.log(`✅ [نقطة تحقق 6ب] تم تلخيص المقطع ${chunkNumber} بواسطة OpenAI بنجاح`);
      } else if (result.source === 'fallback') {
        console.log(`⚠️ [نقطة تحقق 6ب] تم تلخيص المقطع ${chunkNumber} بواسطة النظام الاحتياطي`);
      }

      return result.summary;

    } catch (error) {
      console.error(`❌ [نقطة تحقق 6ب] خطأ في تلخيص المقطع ${chunkNumber}:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      // إرجاع تلخيص احتياطي بدلاً من رمي الخطأ
      return `📝 ملخص المقطع ${chunkNumber}: حدث خطأ في التلخيص - ${error.message}`;
    }
  };

  // بدء التعرف على الكلام المباشر
  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript.trim()) {
            currentTranscriptionRef.current += ' ' + finalTranscript;
            console.log('🎯 نص مُفرّغ جديد:', finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.log('⚠️ تحذير من التعرف على الكلام:', event.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        console.log('🎤 بدء التعرف على الكلام المباشر');
      } else {
        console.log('⚠️ Web Speech API غير مدعوم، سيتم استخدام النصوص الاحتياطية');
      }
    } catch (error) {
      console.error('❌ خطأ في بدء التعرف على الكلام:', error);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    // إخبار المكون الأب بتغيير حالة التسجيل
    if (onRecordingStateChange) {
      onRecordingStateChange(false);
    }

    // إيقاف التعرف على الكلام
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      } catch (e) {
        console.log('التعرف على الكلام توقف بالفعل');
      }
    }

    // إيقاف مؤقت التقسيم
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    // إيقاف التسجيل الحالي
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // إيقاف stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    console.log('⏹️ تم إيقاف التسجيل المتقطع والتعرف على الكلام');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // التحقق من أذونات الميكروفون
  const checkMicrophonePermissions = async () => {
    try {
      console.log('🔍 فحص أذونات الميكروفون...');

      // التحقق من الأذونات المخزنة
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        console.log('📋 حالة إذن الميكروفون:', permission.state);

        if (permission.state === 'denied') {
          alert('❌ تم رفض إذن الميكروفون. يرجى تفعيله من إعدادات المتصفح.');
          return false;
        }
      }

      // اختبار الوصول للميكروفون
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ الميكروفون متاح ويعمل بشكل صحيح');

      // إيقاف الاختبار فوراً
      stream.getTracks().forEach(track => track.stop());

      alert('✅ الميكروفون يعمل بشكل صحيح! يمكنك الآن بدء التسجيل.');
      return true;

    } catch (error) {
      console.error('❌ فشل اختبار الميكروفون:', error);

      let errorMsg = 'فشل في اختبار الميكروفون:\n';
      if (error.name === 'NotAllowedError') {
        errorMsg += '• يرجى السماح بالوصول للميكروفون';
      } else if (error.name === 'NotFoundError') {
        errorMsg += '• لم يتم العثور على ميكروفون متصل';
      } else {
        errorMsg += `• ${error.message}`;
      }

      alert(errorMsg);
      return false;
    }
  };

  return (
    <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" w="full">
      <VStack spacing={4}>
        {/* Timer Display */}
        <Text fontSize="2xl" fontWeight="bold" color={isRecording ? "red.500" : "gray.500"}>
          {formatTime(timer)}
        </Text>

        {/* Control Buttons */}
        <HStack spacing={4}>
          <Button
            colorScheme={isRecording ? "red" : "blue"}
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            isDisabled={processingChunks > 3} // منع التسجيل إذا كانت هناك مقاطع كثيرة قيد المعالجة
          >
            {isRecording ? "⏹️ إيقاف التسجيل" : "🎙️ بدء التسجيل"}
          </Button>
        </HStack>

        </VStack>
    </Box>
  );
};

export default AudioRecorder;