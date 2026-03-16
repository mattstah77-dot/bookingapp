import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import { useBooking } from '../hooks/useBooking';
import type { Service } from '../types/booking';
import { Greeting } from '../components/Greeting/Greeting';
import { ServiceCard } from '../components/ServiceCard/ServiceCard';
import { Calendar } from '../components/Calendar/Calendar';
import { TimeSlots } from '../components/TimeSlots/TimeSlots';
import { BackButton } from '../components/BackButton/BackButton';
import { Button } from '../components/Button/Button';

const API_BASE = '/api';

export default function BookingPage() {
  const theme = useTelegramTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

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

  // Загрузка услуг при старте
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE}/services`);
        const data = await res.json();
        setServices(data);
      } catch (err) {
        console.error('Failed to fetch services:', err);
        setError('Не удалось загрузить услуги');
      }
    };
    fetchServices();
  }, []);

  // Загрузка слотов при выборе даты
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !selectedService) {
        setTimeSlots([]);
        return;
      }

      setLoading(true);
      try {
        // Форматируем дату в локальном времени
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const res = await fetch(
          `${API_BASE}/slots?date=${dateStr}&duration=${selectedService.duration}`
        );
        const data = await res.json();
        setTimeSlots(data);
      } catch (err) {
        console.error('Failed to fetch slots:', err);
        setError('Не удалось загрузить время');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedService]);

  // Форматированная дата
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDate]);

  // Обработка бронирования
  const handleBooking = useCallback(async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      // Форматируем дату в локальном времени
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          date: dateStr,
          time: selectedSlot,
          duration: selectedService.duration,
          price: selectedService.price,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка бронирования');
      }

      setBookingSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка бронирования');
    } finally {
      setSubmitting(false);
    }
  }, [selectedService, selectedDate, selectedSlot]);

  // Переинициализация при успешном бронировании
  const handleReset = useCallback(() => {
    setBookingSuccess(false);
    setError(null);
    setTimeSlots([]);
    reset();
  }, [reset]);

  // Определение темной темы - ДО ранних return
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  // Ошибка
  if (error && step === 'services') {
    return (
      <div 
        className="min-h-screen p-4 flex items-center justify-center"
        style={{ backgroundColor: theme.bgColor }}
      >
        <div className="text-center">
          <p style={{ color: theme.buttonColor }}>{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: 16 }}
          >
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  // Успешное бронирование
  if (bookingSuccess) {
    return (
      <div 
        className="min-h-screen p-4"
        style={{ 
          backgroundColor: theme.bgColor,
          paddingTop: 'env(safe-area-inset-top, 20px)',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        }}
      >
        <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div 
            className="text-center animate-fade-in"
            style={{ 
              backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px)',
              borderRadius: 24,
              padding: 40,
              border: `1px solid ${theme.hintColor}20`,
            }}
          >
            <div 
              className="text-6xl mb-4"
              style={{ color: theme.buttonColor }}
            >
              ✓
            </div>
            <h2 
              className="text-2xl font-semibold mb-2"
              style={{ color: theme.textColor }}
            >
              Запись подтверждена!
            </h2>
            <p style={{ color: theme.hintColor }}>
              Мы ждём вас {formattedDate} в {selectedSlot}
            </p>
            <Button
              onClick={handleReset}
              style={{ 
                marginTop: 24,
                backgroundColor: theme.buttonColor,
                color: theme.buttonTextColor,
              }}
            >
              Записаться снова
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Debug
  console.log('DEBUG:', { step, selectedService: !!selectedService, selectedDate: !!selectedDate, selectedSlot });

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

        {/* Сообщение об ошибке */}
        {error && (
          <div 
            className="mb-4 p-3 rounded-xl"
            style={{ 
              backgroundColor: `${theme.buttonColor}15`,
              color: theme.buttonColor,
            }}
          >
            {error}
          </div>
        )}

        {/* ЭКРАН 1: Список услуг */}
        {step === 'services' && (
          <div className="space-y-3">
            {services.map((service, index) => (
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
            {services.length === 0 && !error && (
              <div className="text-center py-8" style={{ color: theme.hintColor }}>
                Загрузка услуг...
              </div>
            )}
          </div>
        )}

        {/* ЭКРАН 2: Календарь и выбор времени */}
        {step === 'calendar' && selectedService && (
          <div className="space-y-4">
            {/* Выбранная услуга */}
            <div 
              className="rounded-xl p-4 border"
              style={{ 
                borderColor: `${theme.hintColor}20`,
                backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium" style={{ color: theme.textColor }}>
                  {selectedService.name}
                </span>
                <span style={{ color: theme.buttonColor }}>
                  {selectedService.price} ₽
                </span>
              </div>
              <div className="text-sm mt-1" style={{ color: theme.hintColor }}>
                Длительность: {selectedService.duration} мин
              </div>
            </div>

            {/* Календарь */}
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={selectDate}
            />

            {/* Слоты времени */}
            {selectedDate && (
              <TimeSlots
                slots={timeSlots}
                selectedSlot={selectedSlot}
                onSlotSelect={selectSlot}
                loading={loading}
              />
            )}
          </div>
        )}

        {/* ЭКРАН 2б: Выбор времени (когда дата выбрана, но слот нет) */}
        {step === 'time' && selectedService && selectedDate && !selectedSlot && (
          <div className="space-y-4">
            {/* Выбранная услуга */}
            <div 
              className="rounded-xl p-4 border"
              style={{ 
                borderColor: `${theme.hintColor}20`,
                backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium" style={{ color: theme.textColor }}>
                  {selectedService.name}
                </span>
                <span style={{ color: theme.buttonColor }}>
                  {selectedService.price} ₽
                </span>
              </div>
              <div className="text-sm mt-1" style={{ color: theme.hintColor }}>
                {formattedDate}
              </div>
            </div>

            <TimeSlots
              slots={timeSlots}
              selectedSlot={selectedSlot}
              onSlotSelect={selectSlot}
              loading={loading}
            />
          </div>
        )}

        {/* ЭКРАН 3: Подтверждение */}
        {step === 'confirm' && selectedService && selectedDate && selectedSlot && (
          <div className="space-y-4 animate-fade-in">
            {/* Карточка подтверждения */}
            <div 
              className="rounded-2xl p-6 border space-y-4"
              style={{ 
                borderColor: `${theme.hintColor}20`,
                backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.5)',
              }}
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
              onClick={handleBooking}
              loading={submitting}
              style={{ 
                backgroundColor: theme.buttonColor,
                color: theme.buttonTextColor,
                width: '100%',
              }}
            >
              Записаться
            </Button>

            {/* Кнопка сброса */}
            <button
              onClick={handleReset}
              className="block w-full text-center text-sm py-2"
              style={{ color: theme.hintColor }}
            >
              Начать заново
            </button>
          </div>
        )}
      </div>

      {/* Стили */}
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