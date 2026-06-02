import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BarcodeScanner from '@/components/food/BarcodeScanner';
import LiveCameraAnalyzer from '@/components/food/LiveCameraAnalyzer';
import ProductSearch from '@/components/food/ProductSearch';

export default function FoodLogActions({
  tr,
  showSearch,
  setShowSearch,
  handleAiResult,
  handleBarcodeResult,
  handleSearchAdd,
}) {
  return (
    <>
      <section className="grid grid-cols-3 gap-2">
        <LiveCameraAnalyzer onResult={handleAiResult} />
        <Button
          type="button"
          variant={showSearch ? 'default' : 'outline'}
          className="h-12 rounded-xl text-xs gap-2"
          onClick={() => setShowSearch((value) => !value)}
        >
          <Search className="h-4 w-4" />
          {tr('Пошук', 'Search')}
        </Button>
        <BarcodeScanner onResult={handleBarcodeResult} />
      </section>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ProductSearch onAdd={handleSearchAdd} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
