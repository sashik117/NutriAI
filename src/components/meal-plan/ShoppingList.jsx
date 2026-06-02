import { Button } from '@/components/ui/button';
import { Check, Copy, Loader2, Save, ShoppingCart, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useShoppingList } from '@/hooks/useShoppingList';

export default function ShoppingList({ day, dayIndex = 0, meals = [], activeMeals, autoGenerateToken = 0, onGenerateRequest }) {
  const { isEnglish, text } = useLanguage();
  const sourceMeals = activeMeals || meals;
  const {
    list,
    generating,
    saved,
    totalItems,
    checkedCount,
    generate,
    updateItem,
    deleteItem,
    saveList,
    copyToClipboard,
  } = useShoppingList({ day, dayIndex, sourceMeals, autoGenerateToken, translate: text });

  const categoryLabel = (name) => {
    if (!isEnglish) return name;
    return name
      .replace('Овочі та фрукти', 'Vegetables & fruit')
      .replace("М'ясо та риба", 'Meat & fish')
      .replace('Молочка', 'Dairy')
      .replace('Бакалія', 'Pantry')
      .replace('Додатково', 'Extras')
      .replace('Інше', 'Other');
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{text('Список покупок', 'Shopping list')}</p>
          <p className="text-xs text-muted-foreground">
            {text('Вибрано страв', 'Selected meals')}: <span className="font-semibold text-foreground">{sourceMeals.length}</span>
          </p>
        </div>
        {list && <p className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{checkedCount}/{totalItems}</p>}
      </div>

      {!list ? (
        <Button variant="outline" className="h-12 w-full rounded-xl gap-2" onClick={onGenerateRequest || generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          {generating ? text('Складаю список...', 'Building list...') : text('Скласти список покупок', 'Build shopping list')}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl gap-1.5" onClick={saveList}>
              <Save className="h-3.5 w-3.5" />
              {saved ? text('Збережено', 'Saved') : text('Зберегти', 'Save')}
            </Button>
            <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl gap-1.5" onClick={copyToClipboard}>
              <Copy className="h-3.5 w-3.5" />
              {text('Копія', 'Copy')}
            </Button>
            <Button size="sm" variant="ghost" className="h-9 rounded-xl px-3" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : text('Оновити', 'Refresh')}
            </Button>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: totalItems ? `${(checkedCount / totalItems) * 100}%` : '0%' }} />
          </div>

          {list.categories.map((category) => (
            <div key={category.id} className="rounded-2xl bg-muted/35 p-3">
              <p className="mb-2 text-xs font-extrabold text-muted-foreground">{categoryLabel(category.name)}</p>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div key={item.id} className={`rounded-xl bg-background p-2 ${item.checked ? 'opacity-55' : ''}`}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateItem(category.id, item.id, { checked: !item.checked })}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
                      >
                        {item.checked && <Check className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${item.checked ? 'line-through' : ''}`}>{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.displayAmount}</p>
                      </div>
                      <button type="button" className="rounded-full p-2 text-muted-foreground hover:text-destructive" onClick={() => deleteItem(category.id, item.id)} title={text('Видалити', 'Delete')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.note && <p className="mt-1 pl-7 text-[10px] text-muted-foreground">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
