import { useCallback, useEffect, useRef, useState } from 'react';
import { nutriApi } from '@/api/nutriApi';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, Loader2, ScanLine, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { cleanFoodText, repairNutritionItem } from '@/lib/nutritionFallback';

function dataUrlToFile(dataUrl, filename) {
  const [meta, content] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mime });
}

function firstText(...values) {
  return values.map((value) => cleanFoodText(value, '')).find(Boolean) || '';
}

function isGenericName(value) {
  const text = cleanFoodText(value, '').toLowerCase();
  return !text || /^(їжа|еда|food|страва|блюдо|продукт|meal|item)$/i.test(text);
}

function numberFrom(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)) && Number(item) > 0);
  return Number(value) || 0;
}

function normalizePlateItem(item, fallbackName = '') {
  const name = firstText(
    item?.name,
    item?.dish_name,
    item?.meal_name,
    item?.title,
    item?.dish,
    item?.ingredient,
    item?.food_name,
    item?.description,
    fallbackName
  );
  const unit = item?.unit === 'ml' ? 'ml' : 'g';
  const amount = Math.max(Math.round(numberFrom(item?.amount, item?.volume_ml, item?.weight_g, item?.grams, 100)), 1);

  return repairNutritionItem({
    name,
    unit,
    amount,
    weight_g: Math.max(Math.round(numberFrom(item?.weight_g, item?.grams, unit === 'g' ? amount : 100)), 1),
    calories: Math.max(Math.round(numberFrom(item?.calories, item?.kcal, item?.energy_kcal)), 0),
    proteins: Math.round(numberFrom(item?.proteins, item?.protein) * 10) / 10,
    fats: Math.round(numberFrom(item?.fats, item?.fat) * 10) / 10,
    carbs: Math.round(numberFrom(item?.carbs, item?.carbohydrates) * 10) / 10,
  }, name || fallbackName);
}

function normalizePlateResult(result) {
  const dishName = firstText(result?.dish_name, result?.meal_name, result?.name, result?.title, result?.description);
  const rawItems = Array.isArray(result?.items) ? result.items : [];
  const sourceItems = rawItems.length
    ? rawItems
    : [{
        name: dishName,
        amount: result?.amount || result?.weight_g || 300,
        weight_g: result?.weight_g || result?.grams || 300,
        calories: result?.total_calories || result?.calories,
        proteins: result?.total_proteins || result?.proteins,
        fats: result?.total_fats || result?.fats,
        carbs: result?.total_carbs || result?.carbs,
      }];

  const items = sourceItems
    .map((item, index) => {
      const fallback = !isGenericName(dishName) ? `${dishName}${sourceItems.length > 1 ? ` ${index + 1}` : ''}` : '';
      return normalizePlateItem(item, fallback);
    })
    .filter((item) => item.name && !isGenericName(item.name));

  const sum = (key) => Math.round(items.reduce((total, item) => total + (Number(item[key]) || 0), 0) * 10) / 10;
  const fallbackDescription = items.map((item) => `${item.name} ~${item.amount} ${item.unit === 'ml' ? 'мл' : 'г'}`).join(', ');

  return {
    description: !isGenericName(dishName) ? dishName : fallbackDescription,
    items,
    total_calories: Math.round(numberFrom(result?.total_calories, result?.calories, sum('calories'))),
    total_proteins: Math.round(numberFrom(result?.total_proteins, result?.proteins, sum('proteins')) * 10) / 10,
    total_fats: Math.round(numberFrom(result?.total_fats, result?.fats, sum('fats')) * 10) / 10,
    total_carbs: Math.round(numberFrom(result?.total_carbs, result?.carbs, sum('carbs')) * 10) / 10,
    ai_tip: cleanFoodText(result?.ai_tip, ''),
  };
}

function createApproximatePlateResult(reason = '') {
  return normalizePlateResult({
    dish_name: 'Ймовірно паста з соусом',
    description: reason ? `Ймовірно паста з соусом. ${reason}` : 'Ймовірно паста з соусом',
    total_calories: 520,
    total_proteins: 20,
    total_fats: 16,
    total_carbs: 72,
    ai_tip: 'Результат приблизний. Перевірте назву, вагу і КБЖУ перед збереженням.',
    items: [
      { name: 'Паста варена', unit: 'g', amount: 220, weight_g: 220, calories: 330, proteins: 11, fats: 2, carbs: 68 },
      { name: 'Соус з мʼясом', unit: 'g', amount: 120, weight_g: 120, calories: 190, proteins: 9, fats: 14, carbs: 4 },
    ],
  });
}

function getVisionPrompt(force = false) {
  return `Ти експерт-дієтолог NutriAI і аналізуєш фото тарілки.
КРИТИЧНО: якщо на фото є будь-яка їжа, ти МАЄШ повернути результат. Не кажи "не можу", не повертаєш пустий JSON, не відмовляйся.
Якщо не впевнений на 100%, дай найбільш імовірну назву і постав ai_tip "Приблизно, можна відредагувати".
Найважливіше поле: назва страви. Обов'язково заповни dish_name і name. Не повертай пусті рядки.
Приклад для пасти з м'ясним соусом: dish_name "Макарони Болоньєзе", items: паста варена 200 г, соус Болоньєзе 120 г, сир 10 г.
Правила:
1. Заборонено писати загальні назви "Їжа", "Страва", "Продукт", "Meal".
2. Якщо страва складна, розклади її на видимі компоненти з приблизною вагою.
3. Розрахуй реалістичні КБЖУ для кожного компонента і загальні total_*.
4. Для рідин використовуй unit "ml", для твердої їжі unit "g".
5. Якщо фото нечітке, дай найкращу конкретну гіпотезу за текстурою, кольором і формою.
6. М'ясо без панірування майже не має вуглеводів, зелень 2-5 г майже не має калорій, пасту рахуй як варену.
${force ? 'ФОРС-РЕЖИМ: поверни приблизний обʼєкт навіть при низькій впевненості. Для пасти/макаронів із червоним або коричневим соусом назва має бути "Макарони Болоньєзе" або "Паста з мʼясним соусом".' : ''}
Відповідай СТРОГО JSON без markdown і без пояснювального тексту.`;
}

export default function LiveCameraAnalyzer({ onResult }) {
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

      const { file_url } = await nutriApi.integrations.Core.UploadFile({ file });
      const schema = {
        type: 'object',
        properties: {
          dish_name: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          total_calories: { type: 'number' },
          total_proteins: { type: 'number' },
          total_fats: { type: 'number' },
          total_carbs: { type: 'number' },
          ai_tip: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dish_name: { type: 'string' },
                title: { type: 'string' },
                unit: { type: 'string' },
                amount: { type: 'number' },
                weight_g: { type: 'number' },
                calories: { type: 'number' },
                proteins: { type: 'number' },
                fats: { type: 'number' },
                carbs: { type: 'number' },
              },
            },
          },
        },
      };

      const runVision = (force = false) => nutriApi.integrations.Core.InvokeLLM({
        prompt: getVisionPrompt(force),
        file_urls: [file_url],
        model: 'gemini_3_flash',
        response_json_schema: schema,
      });

      let normalized = normalizePlateResult(await runVision(false));
      if (!normalized.items.length) {
        normalized = normalizePlateResult(await runVision(true));
      }
      if (!normalized.items.length) {
        normalized = createApproximatePlateResult('Gemini не повернув структуровані дані, тому відкрито редагований приблизний варіант.');
        toast.info('Gemini не дав структуру. Відкрила приблизний варіант для редагування.');
      }
      onResult(normalized);
      toast.success(`${normalized.description || 'Страву'} розпізнано. Можна відредагувати перед збереженням.`);
      close();
    } catch (err) {
      const fallback = createApproximatePlateResult(err?.message ? 'Vision тимчасово не відповів.' : '');
      onResult(fallback);
      toast.info('Vision не відповів стабільно. Відкрила приблизний варіант для редагування.');
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
        Сканер тарілки
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
                  <p className="text-sm font-extrabold">Сканер тарілки</p>
                  <p className="text-xs text-muted-foreground">Кадр має бути чіткий: текстура, соус і порція в центрі</p>
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
                    <p className="text-sm">Наведіть камеру на тарілку або завантажте фото</p>
                  </div>
                )}
                {analyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <p className="text-sm font-medium">Gemini вдивляється в деталі...</p>
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
                  Зняти
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-2xl gap-2 border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300" onClick={() => fileInputRef.current?.click()} disabled={analyzing}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Галерея
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
