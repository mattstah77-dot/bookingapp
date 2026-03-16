export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // минуты
  price: number;
  category?: string;
}

export interface TimeSlot {
  time: string; // "10:00"
  available: boolean;
}

export interface BookingState {
  selectedService: Service | null;
  selectedDate: Date | null;
  selectedSlot: string | null;
  step: 'services' | 'calendar' | 'time' | 'confirm';
}

export interface TelegramTheme {
  bgColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  hintColor: string;
  linkColor: string;
}
