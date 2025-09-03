import React, { useState, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';

const SummaryInterface = () => {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
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
    setTranscribedText(''); // مسح النص السابق
    setSummary(''); // مسح الملخص السابق
    startRecording();
  };

  const handleStop = async () => {
    setIsActive(false);
    stopRecording();
  };

  // دالة لإرسال الصوت إلى API
  const sendAudioToAPI = async () => {
    if (!mediaBlobUrl) return;
    
    setIsProcessing(true);
    try {
      // تحويل mediaBlobUrl إلى كائن Blob
      const response = await fetch(mediaBlobUrl);
      const audioBlob = await response.blob();
      
      // إنشاء كائن FormData وإضافة ملف الصوت إليه
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');
      
      // محاكاة استجابة API (استبدل هذا بـ API حقيقي)
      // const apiResponse = await fetch('https://api.example.com/speech-to-text', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      // محاكاة نص مستخرج للعرض (يمكن استبداله بـ API حقيقي)
      setTimeout(async () => {
        const simulatedText = 'هذا نص تجريبي يمثل النص المستخرج من التسجيل الصوتي. يتحدث عن أهمية التكنولوجيا في حياتنا اليومية وكيف يمكن للذكاء الاصطناعي أن يساعد في تحسين العديد من جوانب العمل والتعليم. كما يذكر النص فوائد استخدام التطبيقات الذكية في تسهيل المهام المختلفة.';
        setTranscribedText(simulatedText);
        setIsProcessing(false);
        console.log('النص المستخرج:', simulatedText);
        
        // بدء عملية التلخيص تلقائياً
        await summarizeText(simulatedText);
      }, 2000);
      
      // كود API الحقيقي (معلق للآن):
      /*
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        const extractedText = result.text || result.transcription || 'لم يتم العثور على نص';
        setTranscribedText(extractedText);
        console.log('النص المستخرج:', extractedText);
      } else {
        console.error('خطأ في إرسال الطلب:', apiResponse.status);
        setTranscribedText('خطأ في معالجة الصوت. حاول مرة أخرى.');
      }
      */
      
    } catch (error) {
      console.error('خطأ في إرسال الصوت إلى API:', error);
      setTranscribedText('خطأ في الاتصال. تأكد من الاتصال بالإنترنت.');
      setIsProcessing(false);
    }
  };

  // دالة لتلخيص النص باستخدام AI
  const summarizeText = async (text) => {
    if (!text) return;
    
    setIsSummarizing(true);
    try {
      // تحضير البيانات كـ JSON بدلاً من FormData
      const requestData = {
        text: text,
        max_length: 100,
        min_length: 30
      };
      
      // إرسال طلب POST إلى API التلخيص
      // const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer YOUR_API_KEY'
      //   },
      //   body: JSON.stringify({
      //     model: "gpt-3.5-turbo",
      //     messages: [
      //       {
      //         role: "user",
      //         content: `لخص النص التالي في جملتين أو ثلاث جمل: ${text}`
      //       }
      //     ],
      //     max_tokens: 150
      //   })
      // });
      
      // محاكاة استجابة API للتلخيص
      setTimeout(() => {
        const simulatedSummary = 'ملخص: النص يتحدث عن أهمية التكنولوجيا والذكاء الاصطناعي في تحسين حياتنا اليومية، خاصة في مجالي العمل والتعليم.';
        setSummary(simulatedSummary);
        setIsSummarizing(false);
        console.log('الملخص:', simulatedSummary);
      }, 3000);
      
      // كود API الحقيقي للتلخيص (معلق للآن):
      /*
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        const generatedSummary = result.choices[0].message.content || 'لم يتم إنتاج ملخص';
        setSummary(generatedSummary);
        console.log('الملخص:', generatedSummary);
      } else {
        console.error('خطأ في تلخيص النص:', apiResponse.status);
        setSummary('خطأ في معالجة التلخيص. حاول مرة أخرى.');
      }
      */
      
    } catch (error) {
      console.error('خطأ في تلخيص النص:', error);
      setSummary('خطأ في الاتصال بخدمة التلخيص.');
      setIsSummarizing(false);
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

  return (
    <div style={{ textAlign: 'center', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>واجهة التلخيص</h1>
      <p style={{ fontSize: '24px', margin: '20px 0' }}>{formatTime(timer)}</p>
      <p style={{ 
        fontSize: '16px', 
        margin: '10px 0', 
        color: status === 'recording' ? 'red' : isProcessing ? 'orange' : 'black' 
      }}>
        {getStatusText()}
      </p>
      
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={handleStart} 
          disabled={status === 'recording' || isProcessing || isSummarizing}
          style={{ 
            margin: '0 10px', 
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: (status === 'recording' || isProcessing || isSummarizing) ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (status === 'recording' || isProcessing || isSummarizing) ? 'not-allowed' : 'pointer'
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
          <audio src={mediaBlobUrl} controls style={{ width: '100%', maxWidth: '400px' }} />
        </div>
      )}

      {transcribedText && (
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '8px',
          textAlign: 'right',
          direction: 'rtl'
        }}>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>النص المستخرج:</h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#555',
            margin: '0'
          }}>
            {transcribedText}
          </p>
        </div>
      )}

      {isProcessing && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3cd',
          borderRadius: '5px',
          color: '#856404'
        }}>
          🔄 جاري تحويل الصوت إلى نص...
        </div>
      )}

      {isSummarizing && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d1ecf1',
          borderRadius: '5px',
          color: '#0c5460'
        }}>
          🤖 جاري تلخيص النص باستخدام الذكاء الاصطناعي...
        </div>
      )}

      {summary && (
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '8px',
          textAlign: 'right',
          direction: 'rtl',
          border: '2px solid #007bff'
        }}>
          <h3 style={{ color: '#007bff', marginBottom: '15px' }}>📝 الملخص الذكي:</h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#333',
            margin: '0',
            fontWeight: 'bold'
          }}>
            {summary}
          </p>
        </div>
      )}
    </div>
  );
};

export default SummaryInterface;