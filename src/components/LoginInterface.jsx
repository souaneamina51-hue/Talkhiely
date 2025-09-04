
import React from 'react';
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
  Alert,
  AlertIcon,
  useColorModeValue,
  Divider
} from '@chakra-ui/react';

const LoginInterface = ({ trialStatus }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const mainBg = useColorModeValue('gray.50', 'gray.900');

  const handleLogin = () => {
    // هنا يمكن إضافة منطق تسجيل الدخول
    console.log('تسجيل الدخول...');
    alert('ميزة تسجيل الدخول ستكون متاحة قريباً!');
  };

  const handleSubscribe = () => {
    // هنا يمكن إضافة منطق الاشتراك
    console.log('الاشتراك...');
    alert('ميزة الاشتراك ستكون متاحة قريباً!');
  };

  return (
    <Box bg={mainBg} minH="100vh" py={8}>
      <Container maxW="md">
        <VStack spacing={8}>
          {/* Header */}
          <Card w="full" bg={cardBg} shadow="lg">
            <CardBody textAlign="center">
              <Heading as="h1" size="xl" mb={4} color="blue.600">
                🎤 تطبيق التلخيص الذكي
              </Heading>
              
              <Alert status="warning" borderRadius="lg" mb={6}>
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">انتهت فترتك التجريبية المجانية!</Text>
                  <Text fontSize="sm">
                    لقد استمتعت بـ {7 - (trialStatus.remainingDays || 0)} أيام من الاستخدام المجاني.
                  </Text>
                </VStack>
              </Alert>

              <Text fontSize="lg" color="gray.600" mb={6}>
                للمتابعة في استخدام التطبيق، يرجى تسجيل الدخول أو الاشتراك
              </Text>

              {/* Action Buttons */}
              <VStack spacing={4}>
                <Button
                  onClick={handleLogin}
                  colorScheme="blue"
                  size="lg"
                  w="full"
                  leftIcon={<Text>🔐</Text>}
                >
                  تسجيل الدخول
                </Button>

                <Divider />

                <Text fontSize="sm" color="gray.500">أو</Text>

                <Button
                  onClick={handleSubscribe}
                  colorScheme="green"
                  size="lg"
                  w="full"
                  leftIcon={<Text>⭐</Text>}
                >
                  اشترك الآن
                </Button>
              </VStack>

              {/* Features List */}
              <Box mt={8} textAlign="right">
                <Text fontSize="md" fontWeight="bold" mb={3} color="gray.700">
                  مميزات الاشتراك:
                </Text>
                <VStack align="start" spacing={2} fontSize="sm" color="gray.600">
                  <HStack>
                    <Text>✅</Text>
                    <Text>تلخيص غير محدود للتسجيلات</Text>
                  </HStack>
                  <HStack>
                    <Text>✅</Text>
                    <Text>حفظ الملخصات في السحابة</Text>
                  </HStack>
                  <HStack>
                    <Text>✅</Text>
                    <Text>مشاركة متقدمة للملخصات</Text>
                  </HStack>
                  <HStack>
                    <Text>✅</Text>
                    <Text>دعم فني على مدار الساعة</Text>
                  </HStack>
                </VStack>
              </Box>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default LoginInterface;
