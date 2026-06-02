import { Loader2, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import BarcodeScannerModal from './BarcodeScannerModal';

export default function BarcodeScanner({ onResult }) {
  const scanner = useBarcodeScanner({ onResult });

  return (
    <>
      <input
        ref={scanner.fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => scanner.handleFile(event.target.files?.[0])}
      />
      <Button type="button" variant="outline" className="h-12 w-full rounded-xl text-xs gap-2" onClick={scanner.openModal} disabled={scanner.scanning}>
        {scanner.scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
        {scanner.scanning ? scanner.text('Шукаю продукт...', 'Searching...') : scanner.text('Штрих-код', 'Barcode')}
      </Button>

      <BarcodeScannerModal {...scanner} />
    </>
  );
}
