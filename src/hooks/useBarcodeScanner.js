import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useLanguage } from '@/lib/LanguageContext';
import { analyzeProductLabel, extractBarcode, fetchProductByBarcode } from '@/services/barcodeScannerService';

const BARCODE_CAMERA_CONSTRAINTS = {
  video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
};

export function useBarcodeScanner({ onResult }) {
  const { text } = useLanguage();
  const fileInputRef = useRef(null);
  const scanTimerRef = useRef(null);
  const scanningRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState('');
  const [detectedCode, setDetectedCode] = useState('');
  const [needsLabelPhoto, setNeedsLabelPhoto] = useState(false);

  const {
    videoRef,
    cameraActive,
    startCamera: startCameraStream,
    stopCamera: stopCameraStream,
    captureFrameFile,
  } = useCameraStream({
    constraints: BARCODE_CAMERA_CONSTRAINTS,
    onError: () => toast.error(text('Немає доступу до камери', 'No camera access')),
  });

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  const stopCamera = useCallback(() => {
    clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    stopCameraStream();
  }, [stopCameraStream]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setPreview('');
    setDetectedCode('');
    setNeedsLabelPhoto(false);
    stopCamera();
  }, [stopCamera]);

  const applyResult = useCallback((result) => {
    if (!result?.name) return;
    onResult(result);
    closeModal();
  }, [closeModal, onResult]);

  const captureCurrentFrame = useCallback(() => captureFrameFile('barcode-label.jpg', 0.92), [captureFrameFile]);

  const analyzeLabelWithGemini = useCallback(async (file, barcodeHint = '') => {
    setScanning(true);
    setNeedsLabelPhoto(false);
    try {
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(file);

      const normalized = await analyzeProductLabel(file, barcodeHint);
      if (!normalized.name) {
        toast.error(text('Не вдалося прочитати етикетку', 'Could not read the label'));
        return;
      }

      toast.success(text(`${normalized.name} розпізнано через Gemini`, `${normalized.name} recognized by Gemini`));
      applyResult(normalized);
    } catch (error) {
      toast.error(error?.message || text('Не вдалося розпізнати етикетку', 'Could not recognize the label'));
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [applyResult, text]);

  const lookupCode = useCallback(async (rawValue, frameFile = null) => {
    const code = extractBarcode(rawValue);
    if (!code) return;

    setDetectedCode(code);
    setScanning(true);
    try {
      const product = await fetchProductByBarcode(code);
      if (product) {
        toast.success(text(`${product.name} знайдено`, `${product.name} found`));
        applyResult(product);
        return;
      }

      toast.info(text('У базі немає. Читаю етикетку через Gemini.', 'Not found in database. Reading the label with Gemini.'));
      if (frameFile) {
        await analyzeLabelWithGemini(frameFile, code);
      } else {
        setNeedsLabelPhoto(true);
      }
    } catch {
      if (frameFile) {
        await analyzeLabelWithGemini(frameFile, code);
      } else {
        setNeedsLabelPhoto(true);
      }
    } finally {
      setScanning(false);
    }
  }, [analyzeLabelWithGemini, applyResult, text]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    await analyzeLabelWithGemini(file, detectedCode);
  }, [analyzeLabelWithGemini, detectedCode]);

  const startCamera = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      toast.info(text('Сканер недоступний у цьому браузері. Завантажте фото етикетки.', 'Scanner is not available in this browser. Upload a label photo.'));
      fileInputRef.current?.click();
      return;
    }

    try {
      setDetectedCode('');
      setNeedsLabelPhoto(false);
      const stream = await startCameraStream();
      if (!stream) return;

      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      });

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || scanningRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const rawValue = codes?.[0]?.rawValue;
          if (rawValue) {
            const frameFile = captureCurrentFrame();
            stopCamera();
            lookupCode(rawValue, frameFile);
          }
        } catch {
          // Browser barcode detector can fail on autofocus frames while the camera is moving.
        }
      }, 650);
    } catch {
      toast.error(text('Немає доступу до камери', 'No camera access'));
    }
  }, [captureCurrentFrame, lookupCode, startCameraStream, stopCamera, text, videoRef]);

  const chooseLabelPhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    text,
    fileInputRef,
    open,
    scanning,
    preview,
    detectedCode,
    needsLabelPhoto,
    videoRef,
    cameraActive,
    openModal: () => setOpen(true),
    closeModal,
    handleFile,
    startCamera,
    chooseLabelPhoto,
  };
}
