import { Button } from '@/components/ui/button';
import { ScanLine } from 'lucide-react';
import { usePlateScanner } from '@/hooks/usePlateScanner';
import PlateScannerModal from './PlateScannerModal';

export default function LiveCameraAnalyzer({ onResult }) {
  const scanner = usePlateScanner({ onResult });

  return (
    <>
      <input
        ref={scanner.fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => scanner.analyzeFile(event.target.files?.[0])}
      />

      <Button type="button" variant="outline" className="h-12 w-full rounded-xl text-xs gap-2" onClick={scanner.openScanner}>
        <ScanLine className="h-4 w-4 text-primary" />
        {scanner.text('Сканер тарілки', 'Plate scanner')}
      </Button>

      <PlateScannerModal {...scanner} />
    </>
  );
}
