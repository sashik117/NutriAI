import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Plus, Pencil, Check, Beef, Wheat, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ManualAddForm from './ManualAddForm';
import { useProductSearch } from '@/hooks/useProductSearch';

function EditField({ label, icon, value, onChange }) {
  return (
    <label className="rounded-2xl border border-border bg-background/80 p-2">
      <span className="mb-1 block text-[10px] font-extrabold text-muted-foreground">{icon} {label}</span>
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl text-sm font-bold"
      />
    </label>
  );
}

export default function ProductSearch({ onAdd }) {
  const {
    query,
    setQuery,
    results,
    loading,
    searched,
    showManual,
    setShowManual,
    editingIndex,
    draftProduct,
    search,
    addItem,
    startEdit,
    updateDraft,
    saveDraft,
  } = useProductSearch({ onAdd });

  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-3 shadow-sm">
      <div className="flex gap-2">
        <Input
          placeholder="Пошук продукту... наприклад макарони, кефір, Snickers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && search()}
          className="rounded-2xl text-sm"
        />
        <Button type="button" onClick={search} disabled={loading || !query.trim()} className="shrink-0 rounded-2xl px-4">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {loading && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2 text-center text-xs text-muted-foreground">
            Шукаю в базі і звіряю КБЖУ...
          </motion.p>
        )}

        {!loading && searched && results.length === 0 && !showManual && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Не знайшла в базі. Можна додати вручну тут же.</p>
            <Button type="button" variant="outline" className="mt-2 h-9 rounded-xl text-xs" onClick={() => setShowManual(true)}>
              Додати вручну
            </Button>
          </motion.div>
        )}

        {showManual && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <ManualAddForm onAdd={addItem} />
          </motion.div>
        )}

        {results.map((product, index) => {
          const isEditing = editingIndex === index;
          const visibleProduct = isEditing ? draftProduct : product;

          return (
            <motion.div
              key={`${product.name}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-3xl border border-border bg-gradient-to-br from-background to-muted/35 p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{visibleProduct.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {visibleProduct.serving_label} · {visibleProduct.amount} {visibleProduct.unit === 'ml' ? 'мл' : 'г'} {visibleProduct.source ? `· ${visibleProduct.source}` : ''}
                  </p>
                  {visibleProduct.brand && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Бренд: {visibleProduct.brand}</p>}
                  {visibleProduct.ingredients && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{visibleProduct.ingredients}</p>}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold sm:grid-cols-4">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"><Flame className="mr-0.5 inline h-3 w-3" />{visibleProduct.calories} ккал</span>
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700"><Beef className="mr-0.5 inline h-3 w-3" />Б: {visibleProduct.proteins}г</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Ж: {visibleProduct.fats}г</span>
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700"><Wheat className="mr-0.5 inline h-3 w-3" />В: {visibleProduct.carbs}г</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => startEdit(product, index)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => addItem(visibleProduct)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {isEditing && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2 rounded-2xl bg-card/90 p-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-extrabold text-muted-foreground">Назва продукту</span>
                    <Input value={draftProduct?.name ?? ''} onChange={(event) => updateDraft('name', event.target.value)} className="h-10 rounded-xl text-sm font-bold" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <EditField label="Порція" icon="г" value={draftProduct?.amount} onChange={(value) => updateDraft('amount', value)} />
                    <EditField label="Ккал" icon="ккал" value={draftProduct?.calories} onChange={(value) => updateDraft('calories', value)} />
                    <EditField label="Білки" icon="Б" value={draftProduct?.proteins} onChange={(value) => updateDraft('proteins', value)} />
                    <EditField label="Жири" icon="Ж" value={draftProduct?.fats} onChange={(value) => updateDraft('fats', value)} />
                    <EditField label="Вуглеводи" icon="В" value={draftProduct?.carbs} onChange={(value) => updateDraft('carbs', value)} />
                  </div>
                  <Button type="button" className="h-10 w-full gap-2 rounded-2xl text-xs" onClick={saveDraft}>
                    <Check className="h-3.5 w-3.5" />
                    Зберегти правки
                  </Button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
