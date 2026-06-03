const numericKeys = new Set([
  'age',
  'weight',
  'target_weight',
  'height',
  'daily_calories',
  'daily_proteins',
  'daily_fats',
  'daily_carbs',
  'daily_water_ml',
  'total_calories',
  'total_proteins',
  'total_fats',
  'total_carbs',
  'amount_ml',
  'max_uses',
  'used_count',
  'waist',
  'hips',
  'chest',
]);

function localDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function serialize(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) {
        if (key === 'date' || key === 'unlocked_date') return [key, localDate(value)];
        return [key, value.toISOString()];
      }
      if (numericKeys.has(key) && value !== null && value !== undefined) {
        return [key, Number(value)];
      }
      return [key, value];
    })
  );
}
