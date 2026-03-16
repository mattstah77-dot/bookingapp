import { useState, useCallback } from 'react';
import type { Service, BookingState } from '../types/booking';

const initialState: BookingState = {
  selectedService: null,
  selectedDate: null,
  selectedSlot: null,
  step: 'services',
};

export function useBooking() {
  const [state, setState] = useState<BookingState>(initialState);

  const selectService = useCallback((service: Service) => {
    setState(prev => ({
      ...prev,
      selectedService: service,
      step: 'calendar',
    }));
  }, []);

  const selectDate = useCallback((date: Date) => {
    setState(prev => ({
      ...prev,
      selectedDate: date,
      step: 'time',
    }));
  }, []);

  const selectSlot = useCallback((slot: string) => {
    setState(prev => ({
      ...prev,
      selectedSlot: slot,
      step: 'confirm',
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      switch (prev.step) {
        case 'calendar':
          return { ...prev, selectedService: null, step: 'services' };
        case 'time':
          return { ...prev, selectedDate: null, step: 'calendar' };
        case 'confirm':
          return { ...prev, selectedSlot: null, step: 'time' };
        default:
          return prev;
      }
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    selectService,
    selectDate,
    selectSlot,
    goBack,
    reset,
  };
}
