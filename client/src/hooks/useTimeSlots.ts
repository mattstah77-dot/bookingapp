import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  generateTimeSlots, 
  getAvailableSlots,
  DEFAULT_SCHEDULE,
  type ScheduleConfig,
  type TimeSlot 
} from '../utils/timeSlots';

interface UseTimeSlotsOptions {
  selectedDate: Date | null;
  serviceDuration: number;
  scheduleConfig?: ScheduleConfig;
  bookedSlots?: string[]; // Занятые слоты с бэкенда
}

interface UseTimeSlotsResult {
  slots: TimeSlot[];
  loading: boolean;
  refetch: () => void;
}

/**
 * Хук для управления временными слотами
 * Автоматически генерирует, фильтрует и обновляет слоты
 */
export function useTimeSlots({
  selectedDate,
  serviceDuration,
  scheduleConfig = DEFAULT_SCHEDULE,
  bookedSlots = [],
}: UseTimeSlotsOptions): UseTimeSlotsResult {
  const [loading, setLoading] = useState(false);

  // Генерация слотов с учётом всех параметров
  const allSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    return generateTimeSlots(
      scheduleConfig,
      serviceDuration,
      bookedSlots
    );
  }, [selectedDate, serviceDuration, scheduleConfig, bookedSlots]);

  // Только доступные слоты (не прошедшие и не занятые)
  const slots = useMemo(() => {
    if (!selectedDate) return [];
    return getAvailableSlots(allSlots, selectedDate);
  }, [allSlots, selectedDate]);

  // Имитация загрузки (для UI feedback)
  useEffect(() => {
    if (selectedDate && serviceDuration) {
      setLoading(true);
      // Имитация асинхронной загрузки
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, serviceDuration]);

  // Ручной refetch (если нужно)
  const refetch = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  }, []);

  return {
    slots,
    loading,
    refetch,
  };
}

export type { TimeSlot, ScheduleConfig };
