
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import SummaryInterface from './components/SummaryInterface';
import LoginInterface from './components/LoginInterface';
import { useTrialPeriod } from './hooks/useTrialPeriod';
import {
  Box,
  Spinner,
  VStack,
  Text,
  Container
} from '@chakra-ui/react';

const LoadingScreen = () => (
  <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
    <Container textAlign="center">
      <VStack spacing={4}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text fontSize="lg" color="gray.600">
          جاري التحقق من حالة حسابك...
        </Text>
      </VStack>
    </Container>
  </Box>
);

const App = () => {
  const { trialStatus, refreshTrialStatus } = useTrialPeriod();

  // عرض شاشة التحميل أثناء فحص الفترة التجريبية
  if (trialStatus.status === 'loading') {
    return (
      <ChakraProvider>
        <LoadingScreen />
      </ChakraProvider>
    );
  }

  // عرض واجهة تسجيل الدخول إذا انتهت الفترة التجريبية
  if (trialStatus.status === 'expired') {
    return (
      <ChakraProvider>
        <LoginInterface trialStatus={trialStatus} />
      </ChakraProvider>
    );
  }

  // عرض التطبيق الرئيسي إذا كانت الفترة التجريبية نشطة
  return (
    <ChakraProvider>
      <SummaryInterface trialStatus={trialStatus} />
    </ChakraProvider>
  );
};

export default App;
