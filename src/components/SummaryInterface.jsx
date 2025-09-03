import React, { useState, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';

const SummaryInterface = () => {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    previewStream
  } = useReactMediaRecorder({ audio: true });

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
    startRecording();
  };

  const handleStop = async () => {
    setIsActive(false);
    stopRecording();
  };

  // دالة لإرسال الصوت إلى API
  const sendAudioToAPI = async (audioBlob) => {
    try {
      // تحويل mediaBlobUrl إلى كائن Blob
      const response = await fetch(mediaBlobUrl);
      const audioBlob = await response.blob();
      
      // إنشاء كائن FormData وإضافة ملف الصوت إليه
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');
      
      // إرسال طلب POST إلى API
      const apiResponse = await fetch('https://api.example.com/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        console.log('النص المستخرج:', result.text || result);
      } else {
        console.error('خطأ في إرسال الطلب:', apiResponse.status);
      }
    } catch (error) {
      console.error('خطأ في إرسال الصوت إلى API:', error);
    }
  };

  // استدعاء sendAudioToAPI عندما يكون mediaBlobUrl متاحاً
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

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>واجهة التلخيص</h1>
      <p style={{ fontSize: '24px', margin: '20px 0' }}>{formatTime(timer)}</p>
      <p style={{ fontSize: '16px', margin: '10px 0', color: status === 'recording' ? 'red' : 'black' }}>
        {getStatusText()}
      </p>
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={handleStart} 
          disabled={status === 'recording'}
          style={{ 
            margin: '0 10px', 
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: status === 'recording' ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: status === 'recording' ? 'not-allowed' : 'pointer'
          }}
        >
          ابدأ
        </button>
        <button 
          onClick={handleStop} 
          disabled={status !== 'recording'}
          style={{ 
            margin: '0 10px', 
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: status !== 'recording' ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: status !== 'recording' ? 'not-allowed' : 'pointer'
          }}
        >
          إيقاف
        </button>
      </div>
      {mediaBlobUrl && (
        <div style={{ marginTop: '20px' }}>
          <p>التسجيل المكتمل:</p>
          <audio src={mediaBlobUrl} controls />
        </div>
      )}
    </div>
  );
};

export default SummaryInterface;