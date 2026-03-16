import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  generateTimeSlots, 
  DEFAULT_SCHEDULE,
  type ScheduleConfig,
  type TimeSlot,
  type Booking 
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
 * Smart Dynamic Slot Engine - полная поддержка всех этапов
 */
export function useTimeSlots({
  selectedDate,
  serviceDuration,
  scheduleConfig = DEFAULT_SCHEDULE,
}: UseTimeSlotsOptions): UseTimeSlotsResult {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Загрузка бронирований с бэкенда при изменении даты
  useEffect(() => {
    if (!selectedDate) {
      setBookings([]);
      return;
    }

    const fetchBookings = async () => {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      try {
        const res = await fetch(
          `${API_BASE}/slots?date=${dateStr}&duration=${serviceDuration}`
        );
        const data = await res.json();
        
        // API возвращает массив занятых времён - конвертируем в формат брони
        const bookedTimes: Booking[] = Array.isArray(data) 
          ? data.map((time: string) => ({
              start: time,
              end: time, // API должно возвращать полные интервалы, но для совместимости
            }))
          : [];
        
        setBookings(bookedTimes);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
        setBookings([]);
      }
    };

    fetchBookings();
  }, [selectedDate, serviceDuration]);

  // Генерация слотов с учётом всех этапов
  const slots = useMemo(() => {
    if (!selectedDate) return [];
    
    return generateTimeSlots({
      config: scheduleConfig,
      serviceDuration,
      bookings,
      selectedDate,
    });
  }, [selectedDate, serviceDuration, scheduleConfig, bookings]);

  // Loading состояние
  useEffect(() => {
    if (selectedDate && serviceDuration) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, serviceDuration, bookings]);

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
      .then((data: string[]) => {
        const bookedTimes: Booking[] = Array.isArray(data) 
          ? data.map((time: string) => ({
              start: time,
              end: time,
            }))
          : [];
        setBookings(bookedTimes);
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

export type { TimeSlot, ScheduleConfig, Booking };
