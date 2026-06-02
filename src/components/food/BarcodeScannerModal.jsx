import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BarcodeScannerModal({
  open,
  text,
  closeModal,
  videoRef,
  cameraActive,
  preview,
  detectedCode,
  needsLabelPhoto,
  scanning,
  startCamera,
  chooseLabelPhoto,
}) {
  return (
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
                <p className="text-xs text-muted-foreground">
                  {text('Якщо бази немає, Gemini прочитає етикетку', 'If the database misses it, Gemini reads the label')}
                </p>
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

            {detectedCode && (
              <p className="mb-3 rounded-xl bg-muted p-2 text-center text-xs text-muted-foreground">
                {text('Код', 'Code')}: {detectedCode}
              </p>
            )}

            {needsLabelPhoto && (
              <p className="mb-3 rounded-xl bg-primary/10 p-3 text-center text-xs text-primary">
                {text(
                  'Продукту немає в базі. Сфотографуйте етикетку з КБЖУ, і Gemini порахує все сам.',
                  'Product is not in the database. Photograph the nutrition label and Gemini will calculate it.'
                )}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button className="h-12 rounded-xl gap-2" onClick={startCamera} disabled={scanning || cameraActive}>
                <Camera className="h-4 w-4" />
                {text('Камера', 'Camera')}
              </Button>
              <Button className="h-12 rounded-xl gap-2" variant="outline" onClick={chooseLabelPhoto} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {text('Етикетка', 'Label')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
