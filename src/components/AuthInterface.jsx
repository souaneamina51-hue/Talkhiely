
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
  Alert,
  AlertIcon,
  useColorModeValue,
  Divider,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Link,
  Checkbox
} from '@chakra-ui/react';

const AuthInterface = ({ trialStatus }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});

  const cardBg = useColorModeValue('white', 'gray.800');
  const mainBg = useColorModeValue('gray.50', 'gray.900');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // التحقق من البيانات
    const newErrors = {};
    if (!loginData.email) newErrors.email = 'البريد الإلكتروني مطلوب';
    if (!loginData.password) newErrors.password = 'كلمة المرور مطلوبة';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // هنا يمكن إضافة منطق تسجيل الدخول الفعلي
      console.log('تسجيل الدخول بالبيانات:', loginData);
      
      // محاكاة طلب API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('تم تسجيل الدخول بنجاح! (محاكاة)');
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      setErrors({ general: 'حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // التحقق من البيانات
    const newErrors = {};
    if (!registerData.fullName) newErrors.fullName = 'الاسم الكامل مطلوب';
    if (!registerData.email) newErrors.email = 'البريد الإلكتروني مطلوب';
    if (!registerData.password) newErrors.password = 'كلمة المرور مطلوبة';
    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }
    if (!registerData.acceptTerms) newErrors.acceptTerms = 'يجب الموافقة على الشروط والأحكام';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // هنا يمكن إضافة منطق التسجيل الفعلي
      console.log('إنشاء حساب بالبيانات:', registerData);
      
      // محاكاة طلب API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
                <VStack align="start" spacing={1} w="full">
                  <Text fontWeight="bold">انتهت فترتك التجريبية المجانية!</Text>
                  <Text fontSize="sm">
                    لقد استمتعت بـ {7 - (trialStatus?.remainingDays || 0)} أيام من الاستخدام المجاني.
                  </Text>
                </VStack>
              </Alert>

              <Text fontSize="lg" color="gray.600" mb={6}>
                للمتابعة في استخدام التطبيق، يرجى تسجيل الدخول أو إنشاء حساب جديد
              </Text>
            </CardBody>
          </Card>

          {/* Auth Tabs */}
          <Card w="full" bg={cardBg} shadow="lg">
            <CardBody>
              <Tabs isFitted variant="enclosed">
                <TabList mb="1em">
                  <Tab>تسجيل الدخول</Tab>
                  <Tab>إنشاء حساب</Tab>
                </TabList>
                
                <TabPanels>
                  {/* Login Tab */}
                  <TabPanel>
                    <form onSubmit={handleLogin}>
                      <VStack spacing={4}>
                        {errors.general && (
                          <Alert status="error" borderRadius="md">
                            <AlertIcon />
                            {errors.general}
                          </Alert>
                        )}

                        <FormControl isInvalid={errors.email} isRequired>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <Input
                            type="email"
                            value={loginData.email}
                            onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                            placeholder="أدخل بريدك الإلكتروني"
                          />
                          <FormErrorMessage>{errors.email}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.password} isRequired>
                          <FormLabel>كلمة المرور</FormLabel>
                          <InputGroup>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              value={loginData.password}
                              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                              placeholder="أدخل كلمة المرور"
                            />
                            <InputRightElement>
                              <IconButton
                                h="1.75rem"
                                size="sm"
                                onClick={() => setShowPassword(!showPassword)}
                                icon={<Text>{showPassword ? '🙈' : '👁️'}</Text>}
                                variant="ghost"
                              />
                            </InputRightElement>
                          </InputGroup>
                          <FormErrorMessage>{errors.password}</FormErrorMessage>
                        </FormControl>

                        <HStack w="full" justify="space-between">
                          <Checkbox size="sm">تذكرني</Checkbox>
                          <Link color="blue.500" fontSize="sm">
                            نسيت كلمة المرور؟
                          </Link>
                        </HStack>

                        <Button
                          type="submit"
                          colorScheme="blue"
                          size="lg"
                          w="full"
                          isLoading={isLoading}
                          loadingText="جاري تسجيل الدخول..."
                        >
                          تسجيل الدخول
                        </Button>
                      </VStack>
                    </form>
                  </TabPanel>

                  {/* Register Tab */}
                  <TabPanel>
                    <form onSubmit={handleRegister}>
                      <VStack spacing={4}>
                        {errors.general && (
                          <Alert status="error" borderRadius="md">
                            <AlertIcon />
                            {errors.general}
                          </Alert>
                        )}

                        <FormControl isInvalid={errors.fullName} isRequired>
                          <FormLabel>الاسم الكامل</FormLabel>
                          <Input
                            value={registerData.fullName}
                            onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
                            placeholder="أدخل اسمك الكامل"
                          />
                          <FormErrorMessage>{errors.fullName}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.email} isRequired>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <Input
                            type="email"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                            placeholder="أدخل بريدك الإلكتروني"
                          />
                          <FormErrorMessage>{errors.email}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.password} isRequired>
                          <FormLabel>كلمة المرور</FormLabel>
                          <InputGroup>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              value={registerData.password}
                              onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                              placeholder="أدخل كلمة مرور قوية"
                            />
                            <InputRightElement>
                              <IconButton
                                h="1.75rem"
                                size="sm"
                                onClick={() => setShowPassword(!showPassword)}
                                icon={<Text>{showPassword ? '🙈' : '👁️'}</Text>}
                                variant="ghost"
                              />
                            </InputRightElement>
                          </InputGroup>
                          <FormErrorMessage>{errors.password}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.confirmPassword} isRequired>
                          <FormLabel>تأكيد كلمة المرور</FormLabel>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={registerData.confirmPassword}
                            onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                            placeholder="أعد إدخال كلمة المرور"
                          />
                          <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.acceptTerms}>
                          <Checkbox
                            isChecked={registerData.acceptTerms}
                            onChange={(e) => setRegisterData({...registerData, acceptTerms: e.target.checked})}
                          >
                            <Text fontSize="sm">
                              أوافق على <Link color="blue.500">الشروط والأحكام</Link> و
                              <Link color="blue.500"> سياسة الخصوصية</Link>
                            </Text>
                          </Checkbox>
                          <FormErrorMessage>{errors.acceptTerms}</FormErrorMessage>
                        </FormControl>

                        <Button
                          type="submit"
                          colorScheme="green"
                          size="lg"
                          w="full"
                          isLoading={isLoading}
                          loadingText="جاري إنشاء الحساب..."
                        >
                          إنشاء حساب جديد
                        </Button>
                      </VStack>
                    </form>
                  </TabPanel>
                </TabPanels>
              </Tabs>

              <Divider my={6} />

              {/* Direct Subscription Option */}
              <VStack spacing={4}>
                <Text fontSize="sm" color="gray.500">أو</Text>
                <Button
                  onClick={handleSubscribe}
                  colorScheme="purple"
                  size="lg"
                  w="full"
                  leftIcon={<Text>⭐</Text>}
                >
                  اشترك مباشرة بدون حساب
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
                  <HStack>
                    <Text>✅</Text>
                    <Text>تحليلات وإحصائيات متقدمة</Text>
                  </HStack>
                  <HStack>
                    <Text>✅</Text>
                    <Text>أولوية في المعالجة</Text>
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

export default AuthInterface;
