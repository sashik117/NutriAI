import { motion } from 'framer-motion';
import { Beef, Flame, Pencil, Plus, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductSearchEditPanel from './ProductSearchEditPanel';

function MacroPills({ product, text }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold sm:grid-cols-4">
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
        <Flame className="mr-0.5 inline h-3 w-3" />{product.calories} {text('ккал', 'kcal')}
      </span>
      <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
        <Beef className="mr-0.5 inline h-3 w-3" />{text('Б', 'P')}: {product.proteins}{text('г', 'g')}
      </span>
      <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{text('Ж', 'F')}: {product.fats}{text('г', 'g')}</span>
      <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
        <Wheat className="mr-0.5 inline h-3 w-3" />{text('В', 'C')}: {product.carbs}{text('г', 'g')}
      </span>
    </div>
  );
}

export default function ProductSearchResultCard({
  addItem,
  draftProduct,
  editingIndex,
  index,
  product,
  saveDraft,
  startEdit,
  text,
  updateDraft,
}) {
  const isEditing = editingIndex === index;
  const visibleProduct = isEditing ? draftProduct : product;
  const unitLabel = visibleProduct.unit === 'ml' ? text('мл', 'ml') : text('г', 'g');

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
            {visibleProduct.serving_label} · {visibleProduct.amount} {unitLabel} {visibleProduct.source ? `· ${visibleProduct.source}` : ''}
          </p>
          {visibleProduct.brand && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{text('Бренд', 'Brand')}: {visibleProduct.brand}</p>}
          {visibleProduct.ingredients && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{visibleProduct.ingredients}</p>}
          <MacroPills product={visibleProduct} text={text} />
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => startEdit(product, index)} aria-label={text('Редагувати продукт', 'Edit product')}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => addItem(visibleProduct)} aria-label={text('Додати продукт', 'Add product')}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isEditing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <ProductSearchEditPanel draftProduct={draftProduct} saveDraft={saveDraft} text={text} updateDraft={updateDraft} />
        </motion.div>
      )}
    </motion.div>
  );
}
