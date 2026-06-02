import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export const EMPTY_MEASUREMENT_FORM = { waist: '', hips: '', chest: '' };

export function buildBodyMeasurementPayload(form = {}) {
  return {
    waist: Number(form.waist) || 0,
    hips: Number(form.hips) || 0,
    chest: Number(form.chest) || 0,
  };
}

export function hasAnyMeasurementValue(form = {}) {
  return Boolean(form.waist || form.hips || form.chest);
}

export function buildBodyMeasurementChartData(measurements = []) {
  return [...measurements]
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .map((measurement) => ({
      date: format(new Date(measurement.date), 'd MMM', { locale: uk }),
      waist: measurement.waist,
      hips: measurement.hips,
      chest: measurement.chest,
    }));
}
