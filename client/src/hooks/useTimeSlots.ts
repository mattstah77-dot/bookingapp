import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  generateTimeSlots, 
  getAvailableSlots,
  DEFAULT_SCHEDULE,
  type ScheduleConfig,
  type TimeSlot 
} from '../utils/timeSlots';

const API_BASE = '/api';

interface UseTimeSlotsOptions {
  selectedDate: Date | null;
  serviceDuration: number;
  scheduleConfig?: ScheduleConfig;
}

interface UseTimeSlotsResult {
  slots: TimeSlot[];
  loading: boolean;
  refetch: () => void;
}

/**
 * Хук для управления временными слотами
 * Автоматически генерирует, фильтрует и обновляет слоты
 * Загружает занятые слоты с бэкенда
 */
export function useTimeSlots({
  selectedDate,
  serviceDuration,
  scheduleConfig = DEFAULT_SCHEDULE,
}: UseTimeSlotsOptions): UseTimeSlotsResult {
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Загрузка занятых слотов с бэкенда при изменении даты
  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([]);
      return;
    }

    const fetchBookedSlots = async () => {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      try {
        const res = await fetch(
          `${API_BASE}/slots?date=${dateStr}&duration=${serviceDuration}`
        );
        const data = await res.json();
        // data - это массив занятых времён
        setBookedSlots(data);
      } catch (err) {
        console.error('Failed to fetch booked slots:', err);
        setBookedSlots([]);
      }
    };

    fetchBookedSlots();
  }, [selectedDate, serviceDuration]);

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

  // Loading состояние
  useEffect(() => {
    if (selectedDate && serviceDuration) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, serviceDuration, bookedSlots]);

  // Ручной refetch
  const refetch = useCallback(() => {
    if (!selectedDate) return;
    
    setLoading(true);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    fetch(`${API_BASE}/slots?date=${dateStr}&duration=${serviceDuration}`)
      .then(res => res.json())
      .then(data => {
        setBookedSlots(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate, serviceDuration]);

  return {
    slots,
    loading,
    refetch,
  };
}

export type { TimeSlot, ScheduleConfig };
