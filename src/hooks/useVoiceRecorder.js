import { useState, useRef } from 'react';
import { transcribeFoodAudio } from '@/services/voiceTranscriptionService';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) return resolve(null);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };

      mediaRecorder.stop();
      setIsRecording(false);
    });
  };

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    try {
      return await transcribeFoodAudio(blob);
    } finally {
      setIsTranscribing(false);
    }
  };

  return { isRecording, isTranscribing, startRecording, stopRecording, transcribeAudio };
}
