import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  generateTimeSlots, 
  DEFAULT_SCHEDULE,
  type ScheduleConfig,
  type TimeSlot,
  type Booking 
} from '../utils/timeSlots';

const API_BASE = '/api';

// Тип для расписания с бэкенда
interface BackendSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

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
  const [config, setConfig] = useState<ScheduleConfig>(scheduleConfig);

  // Загрузка расписания с бэкенда
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedDate) return;
      
      const dayOfWeek = selectedDate.getDay();
      
      try {
        const res = await fetch(`${API_BASE}/schedule?dayOfWeek=${dayOfWeek}`);
        const schedule: BackendSchedule | null = await res.json();
        
        if (schedule) {
          setConfig(prev => ({
            ...prev,
            workDayStart: schedule.startTime,
            workDayEnd: schedule.endTime,
            breakStart: schedule.breakStart,
            breakEnd: schedule.breakEnd,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch schedule:', err);
      }
    };

    fetchSchedule();
  }, [selectedDate]);

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
        // Используем новый эндпоинт для занятых слотов
        const res = await fetch(
          `${API_BASE}/booked-slots?date=${dateStr}`
        );
        const data = await res.json();
        
        // API возвращает массив занятых интервалов
        const bookedTimes: Booking[] = Array.isArray(data) 
          ? data.map((item: { start: string; end: string }) => ({
              start: item.start,
              end: item.end,
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
      config,
      serviceDuration,
      bookings,
      selectedDate,
    });
  }, [selectedDate, serviceDuration, config, bookings]);

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

    fetch(`${API_BASE}/booked-slots?date=${dateStr}`)
      .then(res => res.json())
      .then((data: { start: string; end: string }[]) => {
        const bookedTimes: Booking[] = Array.isArray(data) 
          ? data.map((item) => ({
              start: item.start,
              end: item.end,
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
