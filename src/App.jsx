import React, { useState } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';

const App = () => {
  const [timer, setTimer] = useState(0);
  
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl
  } = useReactMediaRecorder({ audio: true });

  React.useEffect(() => {
    let interval = null;
    if (status === 'recording') {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else if (status === 'stopped') {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [status, timer]);

  const handleStart = () => {
    setTimer(0);
    startRecording();
  };

  const handleStop = () => {
    stopRecording();
  };

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
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>واجهة التلخيص</h1>
      <p style={{ fontSize: '24px', margin: '20px 0' }}>{formatTime(timer)}</p>
      <p style={{ 
        fontSize: '16px', 
        margin: '10px 0', 
        color: status === 'recording' ? 'red' : 'black' 
      }}>
        {getStatusText()}
      </p>
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={handleStart}
          disabled={status === 'recording'}
          style={{
            padding: '10px 20px',
            margin: '0 10px',
            backgroundColor: status === 'recording' ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: status === 'recording' ? 'not-allowed' : 'pointer'
          }}
        >
          ابدأ
        </button>
        <button 
          onClick={handleStop}
          disabled={status !== 'recording'}
          style={{
            padding: '10px 20px',
            margin: '0 10px',
            backgroundColor: status !== 'recording' ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
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

export default App;