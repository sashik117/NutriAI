import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlateScannerModal({
  open,
  text,
  close,
  videoRef,
  cameraActive,
  preview,
  analyzing,
  error,
  capturePhoto,
  choosePhoto,
}) {
  return (
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
                <p className="text-xs text-muted-foreground">
                  {text('Кадр має бути чіткий: текстура, соус і порція в центрі', 'Keep the frame clear: texture, sauce, and portion in the center')}
                </p>
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
              <Button
                type="button"
                className="h-11 rounded-2xl gap-2 bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600"
                onClick={capturePhoto}
                disabled={!cameraActive || analyzing}
              >
                <Camera className="h-4 w-4" />
                {text('Зняти', 'Capture')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl gap-2 border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"
                onClick={choosePhoto}
                disabled={analyzing}
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {text('Галерея', 'Gallery')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
