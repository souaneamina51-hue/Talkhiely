import React, { useState } from 'react';
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
  CardHeader,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  Divider,
  useColorModeValue,
  Badge,
  Spacer,
  Flex
} from '@chakra-ui/react';

const AuthInterface = ({ trialStatus }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const cardBg = useColorModeValue('white', 'gray.800');
  const mainBg = useColorModeValue('gray.50', 'gray.900');

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // محاكاة طلب تسجيل الدخول
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('تم تسجيل الدخول بنجاح! (محاكاة)');
      alert('تم تسجيل الدخول بنجاح! (محاكاة)');
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      setErrors({ general: 'حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // محاكاة طلب إنشاء الحساب
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('تم إنشاء الحساب بنجاح! (محاكاة)');
      alert('تم إنشاء الحساب بنجاح! (محاكاة)');
    } catch (error) {
      console.error('خطأ في إنشاء الحساب:', error);
      setErrors({ general: 'حدث خطأ في إنشاء الحساب. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = () => {
    console.log('الاشتراك المباشر...');
    alert('ميزة الاشتراك المباشر ستكون متاحة قريباً!');
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
                    لقد استمتعت بـ 7 أيام من الاستخدام المجاني.
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    للمتابعة، يرجى تسجيل الدخول أو إنشاء حساب جديد.
                  </Text>
                </VStack>
              </Alert>

              {/* Trial Statistics */}
              <Card bg="blue.50" border="1px solid" borderColor="blue.200" mb={6}>
                <CardHeader pb={2}>
                  <Text fontSize="md" fontWeight="semibold" color="blue.700">
                    📊 إحصائيات فترتك التجريبية
                  </Text>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={2}>
                    <Flex w="full" justify="space-between">
                      <Text fontSize="sm">مدة الاستخدام:</Text>
                      <Badge colorScheme="blue">7 أيام كاملة</Badge>
                    </Flex>
                    <Flex w="full" justify="space-between">
                      <Text fontSize="sm">معرف الجهاز:</Text>
                      <Text fontSize="xs" color="gray.600">
                        {trialStatus.deviceId?.substring(0, 15)}...
                      </Text>
                    </Flex>
                  </VStack>
                </CardBody>
              </Card>
            </CardBody>
          </Card>

          {/* Authentication Form */}
          <Card w="full" bg={cardBg} shadow="lg">
            <CardHeader>
              <HStack spacing={4} justify="center">
                <Button
                  variant={isLogin ? "solid" : "ghost"}
                  colorScheme="blue"
                  onClick={() => setIsLogin(true)}
                >
                  تسجيل الدخول
                </Button>
                <Button
                  variant={!isLogin ? "solid" : "ghost"}
                  colorScheme="blue"
                  onClick={() => setIsLogin(false)}
                >
                  إنشاء حساب
                </Button>
              </HStack>
            </CardHeader>

            <CardBody>
              <VStack spacing={4}>
                {errors.general && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <Text>{errors.general}</Text>
                  </Alert>
                )}

                <FormControl isInvalid={errors.email}>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني"
                    dir="ltr"
                  />
                  <FormErrorMessage>{errors.email}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={errors.password}>
                  <FormLabel>كلمة المرور</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    dir="ltr"
                  />
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                {!isLogin && (
                  <FormControl isInvalid={errors.confirmPassword}>
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      dir="ltr"
                    />
                    <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                  </FormControl>
                )}

                <Button
                  colorScheme="blue"
                  size="lg"
                  w="full"
                  onClick={isLogin ? handleLogin : handleSignup}
                  isLoading={isLoading}
                  loadingText={isLogin ? "جاري تسجيل الدخول..." : "جاري إنشاء الحساب..."}
                >
                  {isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
                </Button>

                <Divider />

                <Button
                  colorScheme="green"
                  variant="outline"
                  size="lg"
                  w="full"
                  onClick={handleSubscribe}
                  leftIcon={<Text>💎</Text>}
                >
                  اشترك الآن والحصول على وصول فوري
                </Button>

                <Text fontSize="sm" color="gray.600" textAlign="center">
                  بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية
                </Text>
              </VStack>
            </CardBody>
          </Card>

          {/* Features Preview */}
          <Card w="full" bg={cardBg} shadow="md">
            <CardHeader>
              <Text fontSize="lg" fontWeight="semibold" color="blue.600">
                ✨ ما ستحصل عليه مع الحساب المدفوع
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="start">
                <HStack>
                  <Text>🎤</Text>
                  <Text fontSize="sm">تسجيل صوتي غير محدود</Text>
                </HStack>
                <HStack>
                  <Text>🤖</Text>
                  <Text fontSize="sm">تلخيص ذكي باستخدام AI متقدم</Text>
                </HStack>
                <HStack>
                  <Text>💾</Text>
                  <Text fontSize="sm">حفظ ومشاركة الملخصات</Text>
                </HStack>
                <HStack>
                  <Text>📱</Text>
                  <Text fontSize="sm">الوصول من جميع الأجهزة</Text>
                </HStack>
                <HStack>
                  <Text>🔒</Text>
                  <Text fontSize="sm">خصوصية وأمان عالي</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default AuthInterface;