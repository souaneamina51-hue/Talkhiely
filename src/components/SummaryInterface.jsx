import React, { useState } from 'react';
import TrialStatusBanner from './TrialStatusBanner';
import AudioRecorder from './AudioRecorder';
import SummariesList from './SummariesList';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Container,
  Button,
  useColorModeValue,
  Alert,
  AlertIcon
} from '@chakra-ui/react';

const SummaryInterface = ({ trialStatus }) => {
  const [summaries, setSummaries] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const mainBg = useColorModeValue('gray.50', 'gray.900');

  // معالج إضافة تلخيص جديد من AudioRecorder
  const handleNewSummary = (summaryData) => {
    console.log('✅ تم استلام تلخيص جديد:', summaryData);
    setSummaries(prev => [...prev, summaryData]);
  };

  // معالج حالة التسجيل
  const handleRecordingStateChange = (recording) => {
    setIsRecording(recording);
  };

  // معالج مسح جميع التلخيصات
  const handleClearAll = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع التلخيصات؟')) {
      setSummaries([]);
    }
  };

  // معالج ترقية الحساب
  const handleUpgrade = () => {
    alert('سيتم توجيهك إلى صفحة الترقية');
  };

  return (
    <Box minH="100vh" bg={mainBg}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8} align="stretch">
          
          {/* Header */}
          <Box textAlign="center" py={4}>
            <Heading size="2xl" color="blue.600" mb={4}>
              🎙️ ابدأ التلخيص الآن
            </Heading>
            <Text fontSize="lg" color="gray.600">
              ذكاء يساعدك في تلخيص محاضراتك بكل سهولة
            </Text>
          </Box>

          {/* Trial Status Banner */}
          {trialStatus && (
            <TrialStatusBanner 
              trialStatus={trialStatus} 
              onUpgrade={handleUpgrade}
            />
          )}

          {/* Audio Recorder Component */}
          <AudioRecorder 
            onNewSummary={handleNewSummary}
            onRecordingStateChange={handleRecordingStateChange}
            trialStatus={trialStatus}
          />

          {/* Action Buttons */}
          {summaries.length > 0 && (
            <HStack justify="center" spacing={4}>
              <Button
                colorScheme="red"
                variant="outline"
                onClick={handleClearAll}
                isDisabled={isRecording}
              >
                🗑️ مسح الكل
              </Button>
              <Button
                colorScheme="green"
                variant="outline"
                onClick={() => {
                  const allText = summaries.map((s, i) => `${i+1}. ${s.summary}`).join('\n\n');
                  navigator.clipboard.writeText(allText);
                  alert('✅ تم نسخ جميع التلخيصات');
                }}
                isDisabled={isRecording}
              >
                📋 نسخ الكل
              </Button>
            </HStack>
          )}

          {/* Summaries List Component */}
          <SummariesList 
            summaries={summaries}
            isRecording={isRecording}
          />

          {/* Instructions */}
          {summaries.length === 0 && !isRecording && (
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <VStack align="start" spacing={2} flex={1}>
                <Text fontWeight="bold">
                  📚 كيفية الاستخدام:
                </Text>
                <VStack align="start" spacing={1} fontSize="sm">
                  <Text>• اضغط "بدء التسجيل" لتشغيل النظام</Text>
                  <Text>• سيتم تقسيم التسجيل تلقائياً كل 7 ثوان</Text>
                  <Text>• ستظهر النقاط المهمة في القائمة تدريجياً</Text>
                  <Text>• يمكنك إيقاف التسجيل في أي وقت</Text>
                </VStack>
              </VStack>
            </Alert>
          )}

          {/* Footer */}
          <Box textAlign="center" py={6}>
            <Text fontSize="sm" color="gray.500">
              نظام التسجيل والتلخيص الذكي - يدعم اللهجة الجزائرية والعربية الفصحى
            </Text>
          </Box>

        </VStack>
      </Container>
    </Box>
  );
};

export default SummaryInterface;