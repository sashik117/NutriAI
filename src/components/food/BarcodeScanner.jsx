import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, Loader2, ScanBarcode, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useCameraStream } from '@/hooks/useCameraStream';
import { analyzeProductLabel, extractBarcode, fetchProductByBarcode } from '@/services/barcodeScannerService';
import { useLanguage } from '@/lib/LanguageContext';

const BARCODE_CAMERA_CONSTRAINTS = {
  video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
};

export default function BarcodeScanner({ onResult }) {
  const { text } = useLanguage();
  const fileInputRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState('');
  const [detectedCode, setDetectedCode] = useState('');
  const [needsLabelPhoto, setNeedsLabelPhoto] = useState(false);
  const { videoRef, cameraActive, startCamera: startCameraStream, stopCamera: stopCameraStream, captureFrameFile } = useCameraStream({
    constraints: BARCODE_CAMERA_CONSTRAINTS,
    onError: () => toast.error('No camera access'),
  });

  const stopCamera = () => {
    clearInterval(scanTimerRef.current);
    stopCameraStream();
  };

  const closeModal = () => {
    setOpen(false);
    setPreview('');
    setDetectedCode('');
    setNeedsLabelPhoto(false);
    stopCamera();
  };

  const applyResult = (result) => {
    if (!result?.name) return;
    onResult(result);
    closeModal();
  };

  const captureCurrentFrame = () => captureFrameFile('barcode-label.jpg', 0.92);

  const analyzeLabelWithGemini = async (file, barcodeHint = '') => {
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
  };

  const lookupCode = async (rawValue, frameFile = null) => {
    const code = extractBarcode(rawValue);
    if (!code) return;
    setDetectedCode(code);
    setScanning(true);
    try {
      const product = await fetchProductByBarcode(code);
      if (product) {
        toast.success(`${product.name} знайдено`);
        applyResult(product);
        return;
      }

      toast.info('У базі немає. Читаю етикетку через Gemini.');
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
  };

  const handleFile = async (file) => {
    if (!file) return;
    await analyzeLabelWithGemini(file, detectedCode);
  };

  const startCamera = async () => {
    if (!('BarcodeDetector' in window)) {
      toast.info('Сканер недоступний у цьому браузері. Завантажте фото етикетки.');
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

      scanTimerRef.current = setInterval(async () => {
        if (!videoRef.current || scanning) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const rawValue = codes?.[0]?.rawValue;
          if (rawValue) {
            const frameFile = captureCurrentFrame();
            stopCamera();
            lookupCode(rawValue, frameFile);
          }
        } catch {
          // Autofocus frames can fail while the camera is moving.
        }
      }, 650);
    } catch {
      toast.error('Немає доступу до камери');
    }
  };

  useEffect(() => () => {
    clearInterval(scanTimerRef.current);
    stopCameraStream();
  }, [stopCameraStream]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <Button type="button" variant="outline" className="h-12 w-full rounded-xl text-xs gap-2" onClick={() => setOpen(true)} disabled={scanning}>
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
        {scanning ? text('Шукаю продукт...', 'Searching...') : text('Штрих-код', 'Barcode')}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-card p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold">{text('Сканер штрих-коду', 'Barcode scanner')}</p>
                  <p className="text-xs text-muted-foreground">{text('Якщо бази немає, Gemini прочитає етикетку', 'If the database misses it, Gemini reads the label')}</p>
                </div>
                <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {cameraActive && (
                <div className="mb-3 overflow-hidden rounded-2xl bg-black">
                  <video ref={videoRef} muted playsInline className="h-56 w-full object-cover" />
                  <div className="border-t border-white/10 bg-black px-3 py-2 text-center text-xs text-white/80">
                    {text('Наведіть камеру на штрих-код', 'Point the camera at the barcode')}
                  </div>
                </div>
              )}

              {preview && (
                <div className="mb-3 overflow-hidden rounded-2xl">
                  <img src={preview} className="h-36 w-full rounded-2xl object-cover" alt="Етикетка продукту" />
                </div>
              )}

              {detectedCode && <p className="mb-3 rounded-xl bg-muted p-2 text-center text-xs text-muted-foreground">{text('Код', 'Code')}: {detectedCode}</p>}

              {needsLabelPhoto && (
                <p className="mb-3 rounded-xl bg-primary/10 p-3 text-center text-xs text-primary">
                  {text('Продукту немає в базі. Сфотографуйте етикетку з КБЖУ, і Gemini порахує все сам.', 'Product is not in the database. Photograph the nutrition label and Gemini will calculate it.')}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button className="h-12 rounded-xl gap-2" onClick={startCamera} disabled={scanning || cameraActive}>
                  <Camera className="h-4 w-4" />
                  {text('Камера', 'Camera')}
                </Button>
                <Button className="h-12 rounded-xl gap-2" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {text('Етикетка', 'Label')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
