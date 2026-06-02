import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  EMPTY_MEASUREMENT_FORM,
  buildBodyMeasurementChartData,
  buildBodyMeasurementPayload,
  hasAnyMeasurementValue,
} from '@/domain/progress/bodyMeasurementModel';
import { bodyMeasurementRepository } from '@/services/repositories';

export function useBodyMeasurements() {
  const [form, setForm] = useState(EMPTY_MEASUREMENT_FORM);
  const [showForm, setShowForm] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: measurements } = useQuery({
    queryKey: ['bodyMeasurements'],
    queryFn: () => bodyMeasurementRepository.list('-date', 30),
    initialData: [],
  });

  const addMutation = useMutation({
    mutationFn: (data) => bodyMeasurementRepository.create({ ...data, date: today }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyMeasurements'] });
      toast.success('Заміри збережено ✅');
      setForm(EMPTY_MEASUREMENT_FORM);
      setShowForm(false);
    },
  });

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const saveMeasurements = () => addMutation.mutate(buildBodyMeasurementPayload(form));

  return {
    form,
    showForm,
    setShowForm,
    updateForm,
    saveMeasurements,
    canSave: hasAnyMeasurementValue(form),
    chartData: buildBodyMeasurementChartData(measurements),
  };
}
