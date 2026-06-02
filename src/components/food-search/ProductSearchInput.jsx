import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProductSearchInput({ loading, query, search, setQuery, text }) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder={text('Пошук продукту... наприклад макарони, кефір, Snickers', 'Search product... e.g. pasta, kefir, Snickers')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && search()}
        className="rounded-2xl text-sm"
        aria-label={text('Пошук продукту', 'Product search')}
      />
      <Button type="button" onClick={search} disabled={loading || !query.trim()} className="shrink-0 rounded-2xl px-4" aria-label={text('Шукати продукт', 'Search product')}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      </Button>
    </div>
  );
}
