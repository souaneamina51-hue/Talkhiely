import React, { useState, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
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

const SummaryInterface = () => {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaries, setSummaries] = useState([]);

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

  const handleStart = () => {
    setIsActive(true);
    setTimer(0);
    setTranscribedText('');
    setSummary('');
    startRecording();
  };

  const handleStop = async () => {
    setIsActive(false);
    stopRecording();
  };

  const sendAudioToAPI = async () => {
    if (!mediaBlobUrl) return;

    setIsProcessing(true);

    try {
      const simulatedText =
        'هذا نص تجريبي يمثل النص المستخرج من التسجيل الصوتي. يتحدث عن أهمية التكنولوجيا في حياتنا اليومية وكيف يمكن للذكاء الاصطناعي أن يساعد في تحسين العديد من جوانب العمل والتعليم. كما يذكر النص فوائد استخدام التطبيقات الذكية في تسهيل المهام المختلفة.';

      setTranscribedText(simulatedText);
      console.log('النص المستخرج:', simulatedText);

      await summarizeText(simulatedText);

      setIsProcessing(false);
    } catch (error) {
      console.error('خطأ في إرسال الصوت إلى API:', error);
      setTranscribedText('خطأ في الاتصال. تأكد من الاتصال بالإنترنت.');
      setIsProcessing(false);
    }
  };

  const summarizeText = async (text) => {
    if (!text) return;

    setIsSummarizing(true);
    try {
      const requestData = {
        text: text,
        max_length: 100,
        min_length: 30
      };

      const simulatedSummary = 'ملخص: النص يتحدث عن أهمية التكنولوجيا والذكاء الاصطناعي في تحسين حياتنا اليومية، خاصة في مجالي العمل والتعليم.';

      setSummary(simulatedSummary);
      const newSummary = {
        id: Date.now(),
        text: simulatedSummary,
        transcribedText: text,
        date: new Date(),
        timestamp: new Date().toLocaleString('ar-SA')
      };

      setSummaries(prevSummaries => [...prevSummaries, newSummary]);
      setIsSummarizing(false);
      console.log('الملخص:', simulatedSummary);
    } catch (error) {
      console.error('خطأ في تلخيص النص:', error);
      setSummary('خطأ في الاتصال بخدمة التلخيص.');
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

  return (
    <Box bg={mainBg} minH="100vh" py={8}>
      <Container maxW="4xl">
        <VStack spacing={8}>
          {/* Header */}
          <Card w="full" bg={cardBg} shadow="lg">
            <CardBody textAlign="center">
              <Heading as="h1" size="xl" mb={4} color="blue.600">
                🎤 واجهة التلخيص الذكي
              </Heading>

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
              <VStack align="start" spacing={2} w="full">
                <Text fontWeight="bold">🔄 جاري تحويل الصوت إلى نص...</Text>
                <Progress size="sm" isIndeterminate colorScheme="orange" w="full" />
              </VStack>
            </Alert>
          )}

          {isSummarizing && (
            <Alert status="info" borderRadius="lg">
              <VStack align="start" spacing={2} w="full">
                <Text fontWeight="bold">🤖 جاري تلخيص النص باستخدام الذكاء الاصطناعي...</Text>
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
                            <Heading size="md" color="blue.700">
                              📝 الملخص رقم {index + 1}
                            </Heading>
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