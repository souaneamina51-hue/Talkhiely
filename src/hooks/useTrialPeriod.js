
import { useState, useEffect } from 'react';

const TRIAL_DURATION_DAYS = 7;
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const useTrialPeriod = () => {
  const [trialStatus, setTrialStatus] = useState({
    status: 'loading', // 'loading', 'active', 'expired', 'error'
    remainingDays: 0,
    deviceId: null
  });

  const [isChecking, setIsChecking] = useState(true);

  // إنشاء أو استرجاع معرف الجهاز
  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  // التحقق محليًا من الفترة التجريبية
  const checkLocalTrial = (deviceId) => {
    const localTrialStart = localStorage.getItem('localTrialStart');

    if (!localTrialStart) {
      localStorage.setItem('localTrialStart', new Date().toISOString());
      return {
        status: 'active',
        remainingDays: TRIAL_DURATION_DAYS,
        deviceId
      };
    }

    const startDate = new Date(localTrialStart);
    const now = new Date();
    const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, TRIAL_DURATION_DAYS - daysPassed);

    return {
      status: remainingDays > 0 ? 'active' : 'expired',
      remainingDays,
      deviceId
    };
  };

  // التحقق من حالة الفترة التجريبية من الخادم أو fallback محلي
  const checkTrialStatus = async () => {
    setIsChecking(true);
    const deviceId = getOrCreateDeviceId();

    try {
      console.log("🔗 طلب إلى:", `${API_BASE_URL}/check-trial`);

      const response = await fetch(`${API_BASE_URL}/check-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId })
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();

      setTrialStatus({
        status: data.status,
        remainingDays: data.remaining_days || 0,
        deviceId
      });

    } catch (error) {
      console.warn("⚠️ فشل الاتصال بالخادم، استخدام التحقق المحلي:", error);

      const localStatus = checkLocalTrial(deviceId);
      setTrialStatus(localStatus);
    } finally {
      setIsChecking(false);
    }
  };

  // تحديث تلقائي يوميًا
  useEffect(() => {
    checkTrialStatus();

    const interval = setInterval(() => {
      setTrialStatus(prev => {
        if (prev.status === 'active' && prev.remainingDays > 0) {
          const newRemaining = prev.remainingDays - 1;
          return {
            ...prev,
            remainingDays: newRemaining,
            status: newRemaining > 0 ? 'active' : 'expired'
          };
        }
        return prev;
      });
    }, 24 * 60 * 60 * 1000); // تحديث كل 24 ساعة

    return () => clearInterval(interval);
  }, []);

  return {
    trialStatus,
    isChecking,
    refreshTrialStatus: checkTrialStatus
  };
};
