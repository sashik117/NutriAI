import { useCallback, useEffect, useRef, useState } from 'react';

export function dataUrlToFile(dataUrl, filename) {
  const [meta, content] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mime });
}

export function useCameraStream({ constraints, onError } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (nextConstraints = constraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        nextConstraints || { video: { facingMode: 'environment' } }
      );
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return stream;
    } catch (error) {
      onError?.(error);
      return null;
    }
  }, [constraints, onError]);

  const captureFrameDataUrl = useCallback((quality = 0.92) => {
    if (!videoRef.current || !videoRef.current.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }, []);

  const captureFrameFile = useCallback((filename, quality = 0.92) => {
    const dataUrl = captureFrameDataUrl(quality);
    return dataUrl ? dataUrlToFile(dataUrl, filename) : null;
  }, [captureFrameDataUrl]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    cameraActive,
    startCamera,
    stopCamera,
    captureFrameDataUrl,
    captureFrameFile,
  };
}
