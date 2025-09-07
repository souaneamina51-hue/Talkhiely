import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Flex,
  Spacer,
  Collapse,
  useDisclosure,
  useColorModeValue,
  Alert,
  AlertIcon,
  Divider,
  IconButton,
  Tooltip
} from '@chakra-ui/react';

const SummariesList = ({ summaries = [], isRecording = false }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const cardBg = useColorModeValue('white', 'gray.800');
  const listBg = useColorModeValue('gray.50', 'gray.900');

  // إنشاء animation للعناصر الجديدة
  const [newItems, setNewItems] = useState(new Set());

  useEffect(() => {
    if (summaries.length > 0) {
      const latestItem = summaries[summaries.length - 1];
      setNewItems(prev => new Set(prev).add(latestItem.id));
      
      // إزالة التأثير بعد 3 ثوان
      setTimeout(() => {
        setNewItems(prev => {
          const updated = new Set(prev);
          updated.delete(latestItem.id);
          return updated;
        });
      }, 3000);
    }
  }, [summaries.length]);

  const toggleExpansion = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // يمكن إضافة toast notification هنا
      console.log('✅ تم نسخ النص إلى الحافظة');
    });
  };

  const exportSummaries = () => {
    const exportText = summaries
      .map((item, index) => 
        `نقطة ${index + 1} (${item.timestamp}):\n${item.summary}\n\n`
      )
      .join('');
    
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ملخص-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (summaries.length === 0 && !isRecording) {
    return (
      <Card bg={cardBg} shadow="md" w="full">
        <CardBody>
          <VStack spacing={4} py={8}>
            <Text fontSize="4xl">🎙️</Text>
            <Text fontSize="lg" fontWeight="bold" color="gray.600" textAlign="center">
              لم يتم تسجيل أي مقاطع بعد
            </Text>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              ابدأ التسجيل لرؤية النقاط والملخصات تظهر تلقائياً
            </Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Box bg={listBg} p={4} borderRadius="lg" w="full">
      <VStack spacing={4} align="stretch">
        
        {/* Header */}
        <Flex align="center" justify="space-between">
          <Heading size="lg" color="blue.600">
            📚 النقاط المهمة ({summaries.length})
          </Heading>
          
          {summaries.length > 0 && (
            <HStack spacing={2}>
              <Tooltip label="تصدير جميع النقاط">
                <Button
                  size="sm"
                  colorScheme="cyan"
                  variant="outline"
                  onClick={exportSummaries}
                >
                  📥 تصدير
                </Button>
              </Tooltip>
              <Tooltip label="مشاركة النقاط">
                <Button
                  size="sm"
                  colorScheme="green"
                  variant="outline"
                  onClick={() => {
                    const shareText = summaries
                      .map((item, index) => `${index + 1}. ${item.summary}`)
                      .join('\n\n');
                    
                    if (navigator.share) {
                      navigator.share({
                        title: 'ملخص التسجيل',
                        text: shareText
                      });
                    } else {
                      navigator.clipboard.writeText(shareText).then(() => {
                        alert('✅ تم نسخ الملخص للحافظة للمشاركة');
                      });
                    }
                  }}
                >
                  📤 مشاركة
                </Button>
              </Tooltip>
            </HStack>
          )}
        </Flex>

        {/* Recording Status */}
        {isRecording && (
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <VStack align="start" spacing={1} flex={1}>
              <Text fontWeight="bold">
                🔴 التسجيل قيد التشغيل - النقاط تظهر تلقائياً
              </Text>
              <Text fontSize="sm">
                كل 7 ثوان سيتم معالجة مقطع جديد وإضافة نقاطه هنا
              </Text>
            </VStack>
          </Alert>
        )}

        {/* Live Counter */}
        {isRecording && summaries.length > 0 && (
          <HStack justify="center" py={2}>
            <Badge colorScheme="green" variant="solid" fontSize="md" px={3} py={1}>
              ✨ تم إضافة {summaries.length} نقطة حتى الآن
            </Badge>
          </HStack>
        )}

        {/* Summaries List */}
        <VStack spacing={3} align="stretch">
          {summaries.map((item, index) => {
            const isExpanded = expandedItems[item.id];
            const isNew = newItems.has(item.id);
            
            return (
              <Card
                key={item.id}
                bg={cardBg}
                shadow={isNew ? "lg" : "md"}
                border={isNew ? "2px solid" : "1px solid"}
                borderColor={isNew ? "green.300" : "gray.200"}
                transform={isNew ? "scale(1.02)" : "scale(1)"}
                transition="all 0.3s ease"
                position="relative"
              >
                {/* New Item Badge */}
                {isNew && (
                  <Badge
                    position="absolute"
                    top="-2"
                    right="4"
                    colorScheme="green"
                    variant="solid"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    جديد ✨
                  </Badge>
                )}

                <CardHeader pb={2}>
                  <Flex align="center" justify="space-between">
                    <HStack spacing={3}>
                      <Badge colorScheme="blue" variant="solid" fontSize="sm" px={3} py={1}>
                        #{index + 1}
                      </Badge>
                      <Text fontWeight="bold" fontSize="lg" color="blue.700">
                        نقطة رقم {index + 1}
                      </Text>
                      {item.chunkNumber && (
                        <Badge colorScheme="purple" variant="outline" fontSize="xs">
                          مقطع {item.chunkNumber}
                        </Badge>
                      )}
                    </HStack>
                    <Badge colorScheme="gray" variant="outline" fontSize="xs">
                      {item.timestamp}
                    </Badge>
                  </Flex>
                </CardHeader>

                <CardBody pt={0}>
                  <VStack align="stretch" spacing={3}>
                    
                    {/* Summary */}
                    <Box>
                      <Text
                        fontSize="md"
                        lineHeight="1.6"
                        color="gray.700"
                        bg="blue.50"
                        p={3}
                        borderRadius="md"
                        borderLeft="4px solid"
                        borderLeftColor="blue.400"
                      >
                        {item.summary}
                      </Text>
                    </Box>

                    {/* Actions */}
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          onClick={() => toggleExpansion(item.id)}
                        >
                          {isExpanded ? "🔼 إخفاء التفاصيل" : "🔽 عرض التفاصيل"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          colorScheme="gray"
                          onClick={() => copyToClipboard(item.summary)}
                        >
                          📋 نسخ
                        </Button>
                      </HStack>
                    </HStack>

                    {/* Expanded Content */}
                    <Collapse in={isExpanded}>
                      <VStack align="stretch" spacing={3} pt={3}>
                        <Divider />
                        
                        {/* Transcription */}
                        {item.transcription && (
                          <Box>
                            <Text fontSize="sm" fontWeight="bold" color="gray.600" mb={2}>
                              📝 النص المفرّغ:
                            </Text>
                            <Text
                              fontSize="sm"
                              color="gray.600"
                              bg="gray.50"
                              p={3}
                              borderRadius="md"
                              fontFamily="monospace"
                              lineHeight="1.5"
                            >
                              {item.transcription}
                            </Text>
                          </Box>
                        )}

                        {/* Metadata */}
                        <HStack justify="space-between" fontSize="xs" color="gray.500">
                          <Text>📅 {new Date(item.date).toLocaleDateString('ar-DZ')}</Text>
                          <Text>🆔 {item.id}</Text>
                        </HStack>
                      </VStack>
                    </Collapse>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </VStack>

        {/* Empty State During Recording */}
        {isRecording && summaries.length === 0 && (
          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <VStack spacing={3} py={6}>
                <Text fontSize="3xl">⏳</Text>
                <Text fontSize="md" fontWeight="bold" color="blue.600">
                  جاري معالجة المقطع الأول...
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  سيظهر الملخص الأول خلال ثوانٍ قليلة
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
};

export default SummariesList;