import { useMemo } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import { useBooking } from '../hooks/useBooking';
import type { Service } from '../types/booking';
import { Greeting } from '../components/Greeting/Greeting';
import { ServiceCard } from '../components/ServiceCard/ServiceCard';
import { Calendar } from '../components/Calendar/Calendar';
import { TimeSlots } from '../components/TimeSlots/TimeSlots';
import { BackButton } from '../components/BackButton/BackButton';
import { Button } from '../components/Button/Button';

// Моковые данные услуг
const mockServices: Service[] = [
  {
    id: '1',
    name: 'Стрижка',
    description: 'Стрижка + укладка',
    duration: 45,
    price: 1500,
  },
  {
    id: '2',
    name: 'Стрижка бороды',
    description: 'Коррекция бороды',
    duration: 30,
    price: 800,
  },
  {
    id: '3',
    name: 'Комплекс',
    description: 'Стрижка + борода',
    duration: 60,
    price: 2000,
  },
  {
    id: '4',
    name: 'Бритьё опасной бритвой',
    description: 'Традиционное бритьё',
    duration: 40,
    price: 1200,
  },
];

// Моковые слоты (заглушка)
const mockTimeSlots = [
  '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

export default function BookingPage() {
  const theme = useTelegramTheme();
  const {
    selectedService,
    selectedDate,
    selectedSlot,
    step,
    selectService,
    selectDate,
    selectSlot,
    goBack,
    reset,
  } = useBooking();

  // Форматированная дата
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDate]);

  return (
    <div 
      className="min-h-screen p-4"
      style={{ 
        backgroundColor: theme.bgColor,
        paddingTop: 'env(safe-area-inset-top, 20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
      }}
    >
      <div className="max-w-md mx-auto">
        {/* Заголовок */}
        {step === 'services' && <Greeting />}

        {/* Навигация назад */}
        {step !== 'services' && <BackButton onClick={goBack} />}

        {/* ЭКРАН 1: Список услуг */}
        {step === 'services' && (
          <div className="space-y-3">
            {mockServices.map((service, index) => (
              <div 
                key={service.id}
                className="card"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ServiceCard
                  service={service}
                  onSelect={selectService}
                />
              </div>
            ))}
          </div>
        )}

        {/* ЭКРАН 2: Календарь */}
        {step === 'calendar' && selectedService && (
          <div className="space-y-4">
            {/* Выбранная услуга */}
            <div 
              className="bg-slate-50 rounded-xl p-4 border"
              style={{ borderColor: theme.hintColor + '20' }}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium" style={{ color: theme.textColor }}>
                  {selectedService.name}
                </span>
                <span style={{ color: theme.buttonColor }}>
                  {selectedService.price} ₽
                </span>
              </div>
            </div>

            {/* Календарь */}
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={selectDate}
            />

            {/* Слоты времени (показываем после выбора даты) */}
            {selectedDate && (
              <TimeSlots
                slots={mockTimeSlots}
                selectedSlot={selectedSlot}
                onSlotSelect={selectSlot}
              />
            )}
          </div>
        )}

        {/* ЭКРАН 3: Подтверждение */}
        {step === 'time' && selectedService && selectedDate && selectedSlot && (
          <div className="space-y-4 animate-fade-in">
            {/* Карточка подтверждения */}
            <div 
              className="bg-slate-50 rounded-2xl p-6 border space-y-4"
              style={{ borderColor: theme.hintColor + '20' }}
            >
              <h3 
                className="text-xl font-semibold text-center"
                style={{ color: theme.textColor }}
              >
                Подтвердите запись
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: theme.hintColor }}>Услуга</span>
                  <span className="font-medium" style={{ color: theme.textColor }}>
                    {selectedService.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.hintColor }}>Дата</span>
                  <span className="font-medium" style={{ color: theme.textColor }}>
                    {formattedDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.hintColor }}>Время</span>
                  <span className="font-medium" style={{ color: theme.textColor }}>
                    {selectedSlot}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span style={{ color: theme.hintColor }}>Итого</span>
                  <span 
                    className="font-bold text-lg"
                    style={{ color: theme.buttonColor }}
                  >
                    {selectedService.price} ₽
                  </span>
                </div>
              </div>
            </div>

            {/* Кнопка подтверждения */}
            <Button
              style={{ 
                backgroundColor: theme.buttonColor,
                color: theme.buttonTextColor,
                width: '100%',
              }}
            >
              Записаться
            </Button>

            {/* Кнопка сброса (для тестирования) */}
            <button
              onClick={reset}
              className="block w-full text-center text-sm py-2"
              style={{ color: theme.hintColor }}
            >
              Начать заново
            </button>
          </div>
        )}
      </div>

      {/* Глобальные стили для анимаций */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .card {
          opacity: 0;
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
