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

const AudioRecorder = ({ onNewSummary, trialStatus }) => {
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
      // طلب أذونات الميكروفون
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      console.log('✅ تم الحصول على إذن الميكروفون للتسجيل المتقطع');

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

      // تشغيل مؤقت التقسيم
      startChunkTimer();
      
    } catch (error) {
      console.error('❌ خطأ في بدء التسجيل:', error);
      alert('حدث خطأ في بدء التسجيل. يرجى التأكد من السماح بالوصول للميكروفون.');
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
      console.log(`🔤 بدء تفريغ المقطع رقم ${chunkNumber}...`);
      
      // محاكاة API call للتفريغ النصي
      // في التطبيق الحقيقي، ستستدعي API endpoint
      const formData = new FormData();
      formData.append('audio', audioBlob, `chunk_${chunkNumber}.webm`);
      formData.append('language', 'ar-DZ');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.text || '';
      
    } catch (error) {
      console.error(`❌ خطأ في تفريغ المقطع ${chunkNumber}:`, error);
      
      // نص احتياطي للاختبار
      return `نص تجريبي من المقطع ${chunkNumber} - ${new Date().toLocaleTimeString('ar-DZ')}. هذا النص يمثل ما تم تسجيله في هذا المقطع من المحاضرة أو الحديث.`;
    }
  };

  const summarizeText = async (text, chunkNumber) => {
    try {
      console.log(`📝 بدء تلخيص المقطع رقم ${chunkNumber}...`);
      
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          language: 'ar-DZ',
          chunkNumber
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.summary || '';
      
    } catch (error) {
      console.error(`❌ خطأ في تلخيص المقطع ${chunkNumber}:`, error);
      
      // تلخيص احتياطي للاختبار
      return `📍 نقطة رقم ${chunkNumber}: ملخص تجريبي للنقاط المهمة في هذا المقطع من المحاضرة أو الحديث الذي تم تسجيله.`;
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
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
    
    console.log('⏹️ تم إيقاف التسجيل المتقطع');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" w="full">
      <VStack spacing={4}>
        <HStack justify="space-between" w="full">
          <Text fontSize="xl" fontWeight="bold" color="blue.600">
            🎙️ التسجيل المتقطع الذكي
          </Text>
          <Badge colorScheme={isRecording ? "red" : "gray"} variant="solid">
            {isRecording ? "🔴 مسجل" : "⏸️ متوقف"}
          </Badge>
        </HStack>

        {/* Timer Display */}
        <Text fontSize="2xl" fontWeight="bold" color={isRecording ? "red.500" : "gray.500"}>
          {formatTime(timer)}
        </Text>

        {/* Recording Stats */}
        <HStack spacing={6}>
          <VStack>
            <Text fontSize="sm" color="gray.600">المقاطع المسجلة</Text>
            <Badge colorScheme="blue" variant="solid" fontSize="md" px={3} py={1}>
              {recordedChunks}
            </Badge>
          </VStack>
          <VStack>
            <Text fontSize="sm" color="gray.600">قيد المعالجة</Text>
            <Badge 
              colorScheme={processingChunks > 0 ? "orange" : "green"} 
              variant="solid" 
              fontSize="md" 
              px={3} 
              py={1}
            >
              {processingChunks}
            </Badge>
          </VStack>
        </HStack>

        {/* Processing Progress */}
        {processingChunks > 0 && (
          <Alert status="info" borderRadius="lg" w="full">
            <AlertIcon />
            <VStack align="start" spacing={2} flex={1}>
              <Text fontWeight="bold">
                🤖 جاري معالجة {processingChunks} مقطع...
              </Text>
              <Progress size="sm" isIndeterminate colorScheme="blue" w="full" />
            </VStack>
          </Alert>
        )}

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

        {/* Info Text */}
        <Text fontSize="sm" color="gray.600" textAlign="center">
          سيتم تقسيم التسجيل تلقائياً كل {CHUNK_DURATION / 1000} ثوان ومعالجة كل مقطع منفرداً
        </Text>
      </VStack>
    </Box>
  );
};

export default AudioRecorder;