
import React from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Text,
  Button,
  HStack,
  Spacer,
  Progress
} from '@chakra-ui/react';

const TrialStatusBanner = ({ trialStatus, onUpgrade }) => {
  if (trialStatus.status !== 'active' || trialStatus.remainingDays > 5) {
    return null;
  }

  const progressValue = (trialStatus.remainingDays / 7) * 100;
  const isUrgent = trialStatus.remainingDays <= 2;

  return (
    <Alert 
      status={isUrgent ? "error" : "warning"} 
      borderRadius="lg" 
      mb={4}
      flexDirection="column"
      alignItems="start"
      p={4}
    >
      <HStack w="full" mb={2}>
        <AlertIcon />
        <Text fontWeight="bold">
          {isUrgent ? 
            `⚠️ تبقى ${trialStatus.remainingDays} ${trialStatus.remainingDays === 1 ? 'يوم' : 'أيام'} على انتهاء فترتك التجريبية!` :
            `🔔 تبقى ${trialStatus.remainingDays} أيام على انتهاء فترتك التجريبية`
          }
        </Text>
        <Spacer />
        <Button
          size="sm"
          colorScheme={isUrgent ? "red" : "orange"}
          onClick={onUpgrade}
        >
          ترقية الآن
        </Button>
      </HStack>
      
      <Box w="full">
        <Progress 
          value={progressValue} 
          colorScheme={isUrgent ? "red" : "orange"}
          size="sm"
          borderRadius="md"
        />
        <Text fontSize="xs" color="gray.600" mt={1}>
          استمتع بجميع المميزات بدون حدود مع الاشتراك المدفوع
        </Text>
      </Box>
    </Alert>
  );
};

export default TrialStatusBanner;
