import { useEffect, useRef, useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, Loader2, ScanBarcode, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { hasUsefulNutrition, repairNutritionItem } from '@/lib/nutritionFallback';

function cleanText(value, fallback = '') {
  return String(value || fallback).replace(/\*/g, '').replace(/[•]/g, '').replace(/\s+/g, ' ').trim();
}

function dataUrlToFile(dataUrl, filename) {
  const [meta, content] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mime });
}

function extractBarcode(rawValue) {
  return String(rawValue || '').match(/\d{8,14}/)?.[0] || String(rawValue || '').trim();
}

function normalizeOpenFoodFacts(product, code) {
  const nutriments = product?.nutriments || {};
  const weight = Math.max(Number(product?.serving_quantity || product?.product_quantity || 100) || 100, 1);
  const ratio = weight / 100;
  const per100 = {
    calories: Number(nutriments['energy-kcal_100g']) || Number(nutriments['energy-kcal']) || 0,
    proteins: Number(nutriments.proteins_100g) || 0,
    fats: Number(nutriments.fat_100g) || 0,
    carbs: Number(nutriments.carbohydrates_100g) || 0,
  };

  const normalized = {
    barcode: code,
    name: cleanText(product?.product_name || product?.generic_name, `Продукт ${code}`),
    brand: cleanText(product?.brands?.split(',')?.[0]),
    serving_label: cleanText(product?.serving_size, `${Math.round(weight)} г`),
    unit: 'g',
    amount: Math.round(weight),
    weight_g: Math.round(weight),
    calories: Math.round(per100.calories * ratio),
    proteins: Math.round(per100.proteins * ratio * 10) / 10,
    fats: Math.round(per100.fats * ratio * 10) / 10,
    carbs: Math.round(per100.carbs * ratio * 10) / 10,
  };
  return repairNutritionItem(normalized, product?.product_name || product?.generic_name || code);
}

function normalizeVisionProduct(result, barcodeHint = '') {
  const packageWeight = Math.max(Number(result?.package_weight_g || result?.weight_g || 100) || 100, 1);
  const ratio = packageWeight / 100;
  const caloriesPer100 = Number(result?.calories_per_100g || result?.per100?.calories || 0);
  const proteinsPer100 = Number(result?.proteins_per_100g || result?.per100?.proteins || 0);
  const fatsPer100 = Number(result?.fats_per_100g || result?.per100?.fats || 0);
  const carbsPer100 = Number(result?.carbs_per_100g || result?.per100?.carbs || 0);

  const normalized = {
    barcode: cleanText(result?.barcode, barcodeHint),
    name: cleanText(result?.name, barcodeHint ? `Продукт ${barcodeHint}` : 'Продукт'),
    brand: cleanText(result?.brand),
    serving_label: cleanText(result?.serving_label, `${Math.round(packageWeight)} г`),
    unit: result?.unit === 'ml' ? 'ml' : 'g',
    amount: Math.max(Math.round(Number(result?.amount ?? result?.volume_ml ?? packageWeight) || packageWeight), 1),
    weight_g: Math.round(packageWeight),
    calories: Math.max(Math.round(Number(result?.calories_total || result?.calories) || caloriesPer100 * ratio), 1),
    proteins: Math.round((Number(result?.proteins_total || result?.proteins) || proteinsPer100 * ratio) * 10) / 10,
    fats: Math.round((Number(result?.fats_total || result?.fats) || fatsPer100 * ratio) * 10) / 10,
    carbs: Math.round((Number(result?.carbs_total || result?.carbs) || carbsPer100 * ratio) * 10) / 10,
  };
  return repairNutritionItem(normalized, result?.name || barcodeHint);
}

async function fetchProductByCode(code) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;
  return normalizeOpenFoodFacts(data.product, code);
}

export default function BarcodeScanner({ onResult }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [preview, setPreview] = useState('');
  const [detectedCode, setDetectedCode] = useState('');
  const [needsLabelPhoto, setNeedsLabelPhoto] = useState(false);

  const stopCamera = () => {
    clearInterval(scanTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
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

  const captureCurrentFrame = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return dataUrlToFile(canvas.toDataURL('image/jpeg', 0.92), 'barcode-label.jpg');
  };

  const analyzeLabelWithGemini = async (file, barcodeHint = '') => {
    setScanning(true);
    setNeedsLabelPhoto(false);
    try {
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(file);

      const { file_url } = await nutriApi.integrations.Core.UploadFile({ file });
      const result = await nutriApi.integrations.Core.InvokeLLM({
        prompt: `Ти розпізнаєш етикетку харчового продукту для NutriAI.
Штрих-код якщо вже зчитано: ${barcodeHint || 'немає'}.
З фото визнач назву продукту, бренд, вагу упаковки та таблицю КБЖУ на 100 г.
Для напоїв і рідин поверни unit "ml" і amount у мілілітрах. Для твердої їжі поверни unit "g" і amount у грамах.
Порахуй загальні калорії, білки, жири і вуглеводи для всієї упаковки або видимої порції.
Поверни тільки JSON. Без markdown, зірочок, маркерів і вигаданих продуктів.`,
        file_urls: [file_url],
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            brand: { type: 'string' },
            barcode: { type: 'string' },
            serving_label: { type: 'string' },
            unit: { type: 'string' },
            amount: { type: 'number' },
            weight_g: { type: 'number' },
            package_weight_g: { type: 'number' },
            calories_per_100g: { type: 'number' },
            proteins_per_100g: { type: 'number' },
            fats_per_100g: { type: 'number' },
            carbs_per_100g: { type: 'number' },
            calories_total: { type: 'number' },
            proteins_total: { type: 'number' },
            fats_total: { type: 'number' },
            carbs_total: { type: 'number' },
            calories: { type: 'number' },
            proteins: { type: 'number' },
            fats: { type: 'number' },
            carbs: { type: 'number' },
          },
        },
      });

      const normalized = normalizeVisionProduct(result, barcodeHint);
      if (!normalized.name) {
        toast.error('Не вдалося прочитати етикетку');
        return;
      }
      toast.success(`${normalized.name} розпізнано через Gemini`);
      applyResult(normalized);
    } catch (error) {
      toast.error(error?.message || 'Не вдалося розпізнати етикетку');
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
      const product = await fetchProductByCode(code);
      if (product && hasUsefulNutrition(product)) {
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

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

  useEffect(() => () => stopCamera(), []);

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
        {scanning ? 'Шукаю продукт...' : 'Штрих-код'}
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
                  <p className="text-sm font-extrabold">Сканер штрих-коду</p>
                  <p className="text-xs text-muted-foreground">Якщо бази немає, Gemini прочитає етикетку</p>
                </div>
                <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {cameraActive && (
                <div className="mb-3 overflow-hidden rounded-2xl bg-black">
                  <video ref={videoRef} muted playsInline className="h-56 w-full object-cover" />
                  <div className="border-t border-white/10 bg-black px-3 py-2 text-center text-xs text-white/80">
                    Наведіть камеру на штрих-код
                  </div>
                </div>
              )}

              {preview && (
                <div className="mb-3 overflow-hidden rounded-2xl">
                  <img src={preview} className="h-36 w-full rounded-2xl object-cover" alt="Етикетка продукту" />
                </div>
              )}

              {detectedCode && <p className="mb-3 rounded-xl bg-muted p-2 text-center text-xs text-muted-foreground">Код: {detectedCode}</p>}

              {needsLabelPhoto && (
                <p className="mb-3 rounded-xl bg-primary/10 p-3 text-center text-xs text-primary">
                  Продукту немає в базі. Сфотографуйте етикетку з КБЖУ, і Gemini порахує все сам.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button className="h-12 rounded-xl gap-2" onClick={startCamera} disabled={scanning || cameraActive}>
                  <Camera className="h-4 w-4" />
                  Камера
                </Button>
                <Button className="h-12 rounded-xl gap-2" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Етикетка
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
