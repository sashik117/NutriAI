import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, Loader2, ScanLine, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { analyzePlatePhoto, createApproximatePlateResult } from '@/services/plateVisionService';
import { useLanguage } from '@/lib/LanguageContext';

function dataUrlToFile(dataUrl, filename) {
  const [meta, content] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mime });
}

export default function LiveCameraAnalyzer({ onResult }) {
  const { text } = useLanguage();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [preview, setPreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setError('');
    setPreview('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('Немає доступу до камери. Можна завантажити фото з галереї.');
    }
  };

  const close = () => {
    stopCamera();
    setOpen(false);
    setPreview('');
    setAnalyzing(false);
    setError('');
  };

  const openScanner = () => {
    setOpen(true);
    setTimeout(startCamera, 120);
  };

  const analyzeFile = async (file) => {
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
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
    setPreview(dataUrl);
    stopCamera();
    await analyzeFile(dataUrlToFile(dataUrl, 'plate-high-quality.jpg'));
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => analyzeFile(event.target.files?.[0])}
      />

      <Button type="button" variant="outline" className="h-12 w-full rounded-xl text-xs gap-2" onClick={openScanner}>
        <ScanLine className="h-4 w-4 text-primary" />
        {text('Сканер тарілки', 'Plate scanner')}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <p className="text-sm font-extrabold">{text('Сканер тарілки', 'Plate scanner')}</p>
                  <p className="text-xs text-muted-foreground">{text('Кадр має бути чіткий: текстура, соус і порція в центрі', 'Keep the frame clear: texture, sauce, and portion in the center')}</p>
                </div>
                <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" onClick={close}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative h-72 overflow-hidden bg-black">
                {cameraActive && <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />}
                {preview && <img src={preview} alt="plate preview" className="h-full w-full object-cover" />}
                {(cameraActive || analyzing) && (
                  <>
                    <div className="pointer-events-none absolute inset-5 rounded-3xl border border-white/50 shadow-[0_0_24px_rgba(255,255,255,0.18)]" />
                    <motion.div
                      className="pointer-events-none absolute left-7 right-7 h-0.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]"
                      animate={{ y: [24, 232, 24] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}
                {!cameraActive && !preview && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-white/70">
                    <Camera className="h-10 w-10" />
                    <p className="text-sm">{text('Наведіть камеру на тарілку або завантажте фото', 'Point the camera at your plate or upload a photo')}</p>
                  </div>
                )}
                {analyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <p className="text-sm font-medium">{text('Gemini вдивляється в деталі...', 'Gemini is checking the details...')}</p>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mx-4 mt-3 rounded-2xl bg-rose-50 p-3 text-center text-xs font-medium text-rose-700 shadow-sm dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-2 p-4">
                <Button type="button" className="h-11 rounded-2xl gap-2 bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600" onClick={capturePhoto} disabled={!cameraActive || analyzing}>
                  <Camera className="h-4 w-4" />
                  {text('Зняти', 'Capture')}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-2xl gap-2 border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300" onClick={() => fileInputRef.current?.click()} disabled={analyzing}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {text('Галерея', 'Gallery')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
