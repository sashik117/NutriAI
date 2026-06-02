import { AnimatePresence, motion } from 'framer-motion';
import ManualAddForm from './ManualAddForm';
import ProductSearchEmptyState from '@/components/food-search/ProductSearchEmptyState';
import ProductSearchInput from '@/components/food-search/ProductSearchInput';
import ProductSearchResultCard from '@/components/food-search/ProductSearchResultCard';
import { useProductSearch } from '@/hooks/useProductSearch';
import { useLanguage } from '@/lib/LanguageContext';

export default function ProductSearch({ onAdd }) {
  const { text } = useLanguage();
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
      <ProductSearchInput loading={loading} query={query} search={search} setQuery={setQuery} text={text} />

      <AnimatePresence mode="popLayout">
        {loading && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2 text-center text-xs text-muted-foreground">
            {text('Шукаю в базі і звіряю КБЖУ...', 'Searching the database and checking macros...')}
          </motion.p>
        )}

        {!loading && searched && results.length === 0 && !showManual && (
          <ProductSearchEmptyState setShowManual={setShowManual} text={text} />
        )}

        {showManual && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <ManualAddForm onAdd={addItem} />
          </motion.div>
        )}

        {results.map((product, index) => (
          <ProductSearchResultCard
            key={`${product.name}-${index}`}
            addItem={addItem}
            draftProduct={draftProduct}
            editingIndex={editingIndex}
            index={index}
            product={product}
            saveDraft={saveDraft}
            startEdit={startEdit}
            text={text}
            updateDraft={updateDraft}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
