
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import SummaryInterface from './components/SummaryInterface';
import AuthInterface from './components/AuthInterface';
import { useTrialPeriod } from './hooks/useTrialPeriod';

const App = () => {
  const { trialStatus, isChecking, refreshTrialStatus } = useTrialPeriod();

  // لا عرض أي شيء أثناء فحص الفترة التجريبية
  if (isChecking) return null;

  // عرض واجهة تسجيل الدخول إذا انتهت الفترة التجريبية
  if (trialStatus.status === 'expired') {
    return (
      <ChakraProvider>
        <AuthInterface trialStatus={trialStatus} />
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
