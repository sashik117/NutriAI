import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useLanguage } from '@/lib/LanguageContext';
import { analyzePlatePhoto, createApproximatePlateResult } from '@/services/plateVisionService';

const PLATE_CAMERA_CONSTRAINTS = {
  video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
};

export function usePlateScanner({ onResult }) {
  const { text } = useLanguage();
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const {
    videoRef,
    cameraActive,
    startCamera: startCameraStream,
    stopCamera,
    captureFrameDataUrl,
    captureFrameFile,
  } = useCameraStream({
    constraints: PLATE_CAMERA_CONSTRAINTS,
    onError: () => setError(text('Немає доступу до камери. Можна завантажити фото з галереї.', 'No camera access. You can upload a photo from the gallery.')),
  });

  const startCamera = useCallback(async () => {
    setError('');
    setPreview('');
    await startCameraStream();
  }, [startCameraStream]);

  const close = useCallback(() => {
    stopCamera();
    setOpen(false);
    setPreview('');
    setAnalyzing(false);
    setError('');
  }, [stopCamera]);

  const openScanner = useCallback(() => {
    setOpen(true);
    window.setTimeout(startCamera, 120);
  }, [startCamera]);

  const analyzeFile = useCallback(async (file) => {
    if (!file) return;
    setAnalyzing(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(file);

      const normalized = await analyzePlatePhoto(file);
      if (!normalized.items.length) {
        toast.info(text('Gemini не дав структуру. Відкрила приблизний варіант для редагування.', 'Gemini did not return structure. Opened an editable estimate.'));
      }

      onResult(normalized);
      toast.success(text('Страву розпізнано. Можна відредагувати перед збереженням.', 'Meal recognized. You can edit before saving.'));
      close();
    } catch (err) {
      const fallback = createApproximatePlateResult(err?.message ? 'Vision тимчасово не відповів.' : '');
      onResult(fallback);
      toast.info(text('Vision тимчасово не відповів. Відкрила приблизний варіант для редагування.', 'Vision did not respond reliably. Opened an editable estimate.'));
      close();
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [close, onResult, text]);

  const capturePhoto = useCallback(async () => {
    const dataUrl = captureFrameDataUrl(0.96);
    const file = captureFrameFile('plate-high-quality.jpg', 0.96);
    if (!dataUrl || !file) return;

    setPreview(dataUrl);
    stopCamera();
    await analyzeFile(file);
  }, [analyzeFile, captureFrameDataUrl, captureFrameFile, stopCamera]);

  const choosePhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    text,
    fileInputRef,
    open,
    preview,
    analyzing,
    error,
    videoRef,
    cameraActive,
    openScanner,
    close,
    analyzeFile,
    capturePhoto,
    choosePhoto,
  };
}
