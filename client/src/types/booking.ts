export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // минуты
  price: number;
  category?: string;
  photos?: string[]; // base64
  sortOrder: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled' | 'cancelled_by_user' | 'cancelled_by_admin' | 'completed' | 'no_show';
  clientName?: string;
  clientPhone?: string;
  telegramId?: number;
  createdAt: string;
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
