import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceInputOptions {
  lang?: string;
  onResult?: (text: string) => void;
  onError?: (errorMessage: string) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { lang = 'ko-KR', onResult, onError } = options;
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const speechRecognizedTextRef = useRef<string>('');

  useEffect(() => {
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!hasMedia && !hasSpeech) {
      setIsSupported(false);
    }
  }, []);

  const sendAudioToGeminiTranscribe = async (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const mimeType = audioBlob.type || 'audio/webm';

          const res = await fetch('/api/transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `서버 오류 (${res.status})`);
          }

          const data = await res.json();
          resolve(data.text || '');
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('오디오 데이터를 읽는 중 오류가 발생했습니다.'));
      reader.readAsDataURL(audioBlob);
    });
  };

  const startListening = useCallback(async () => {
    setErrorMessage(null);
    setTranscript('');
    speechRecognizedTextRef.current = '';
    audioChunksRef.current = [];

    // 1. First, check if mediaDevices or SpeechRecognition is available
    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: any) {
      console.warn('Microphone permission or hardware access issue:', err);
      const isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const errMsg = isPermissionDenied
        ? '마이크 사용 권한이 차단되었습니다. 브라우저 주소창 왼쪽 자물쇠/설정 아이콘에서 마이크를 허용해주세요.'
        : '마이크 장치를 찾을 수 없거나 접근할 수 없습니다.';
      setErrorMessage(errMsg);
      if (onError) onError(errMsg);
      return;
    }

    setIsListening(true);

    // 2. Start MediaRecorder with the active audio stream
    if (stream) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(250); // Slice data every 250ms
      } catch (recErr) {
        console.warn('MediaRecorder init error:', recErr);
      }
    }

    // 3. Simultaneously attempt Web Speech API for real-time live preview (if supported)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentFinal += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          const combined = (currentFinal || currentInterim).trim();
          if (combined) {
            setTranscript(combined);
          }
          if (currentFinal) {
            speechRecognizedTextRef.current = (
              speechRecognizedTextRef.current + ' ' + currentFinal.trim()
            ).trim();
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition warning:', event.error);
          // If Web Speech API fails (e.g. inside iframe sandbox), we still have MediaRecorder recording!
        };

        recognition.onend = () => {
          // If ended prematurely while listening, keep MediaRecorder active
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (srErr) {
        console.warn('SpeechRecognition start failed (will rely on Gemini transcription):', srErr);
      }
    }
  }, [lang, onError]);

  const stopListening = useCallback(async () => {
    setIsListening(false);

    // Stop Web Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    // Stop MediaRecorder and process audio
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      setIsTranscribing(true);
      recorder.onstop = async () => {
        try {
          // Stop all audio tracks to turn off the microphone hardware light
          if (recorder.stream) {
            recorder.stream.getTracks().forEach((track) => track.stop());
          }

          // If Web Speech API already gathered text, check if it's reliable
          const liveText = speechRecognizedTextRef.current.trim() || transcript.trim();

          // Prepare Audio Blob
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          let finalText = liveText;

          // If liveText is empty or short, transcribe using Gemini 3.5 Transcribe
          if (!finalText && audioBlob.size > 1000) {
            const aiText = await sendAudioToGeminiTranscribe(audioBlob);
            finalText = aiText.trim();
          }

          if (finalText) {
            setTranscript(finalText);
            if (onResult) {
              onResult(finalText);
            }
          } else {
            setErrorMessage('음성이 명확하게 감지되지 않았습니다. 마이크 가까이에서 다시 말씀해주세요.');
          }
        } catch (transcribeErr: any) {
          console.error('Audio processing failed:', transcribeErr);
          // If we had any partial liveText, fallback to that
          const fallback = speechRecognizedTextRef.current.trim() || transcript.trim();
          if (fallback) {
            if (onResult) onResult(fallback);
          } else {
            const msg = transcribeErr.message || '음성을 텍스트로 변환하지 못했습니다.';
            setErrorMessage(msg);
            if (onError) onError(msg);
          }
        } finally {
          setIsTranscribing(false);
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        setIsTranscribing(false);
      }
    } else {
      // Just Web Speech finished
      const text = speechRecognizedTextRef.current.trim() || transcript.trim();
      if (text && onResult) {
        onResult(text);
      }
      setIsTranscribing(false);
    }
  }, [transcript, onResult, onError]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Direct simulation helper for environments where hardware mic is blocked
  const insertSimulatedVoiceText = useCallback(
    (text: string) => {
      setTranscript(text);
      setErrorMessage(null);
      if (onResult) {
        onResult(text);
      }
    },
    [onResult]
  );

  return {
    isListening,
    isTranscribing,
    isSupported,
    transcript,
    errorMessage,
    clearError: () => setErrorMessage(null),
    startListening,
    stopListening,
    toggleListening,
    insertSimulatedVoiceText,
  };
}
