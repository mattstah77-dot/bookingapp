import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import { useBooking } from '../hooks/useBooking';
import { useTimeSlots } from '../hooks/useTimeSlots';
import type { Service, Booking } from '../types/booking';
import { getBotIdFromUrl, getTelegramId, getUrlWithBotId } from '../utils';
import { Greeting } from '../components/Greeting/Greeting';
import { ServiceCard } from '../components/ServiceCard/ServiceCard';
import { ServiceModal } from '../components/ServiceModal/ServiceModal';
import { Calendar } from '../components/Calendar/Calendar';
import { TimeSlots } from '../components/TimeSlots/TimeSlots';
import { BackButton } from '../components/BackButton/BackButton';
import { Button } from '../components/Button/Button';
import { Check, ArrowRight, RotateCcw, Settings, Calendar as CalendarIcon, Scissors, ClipboardList, Sun, Moon } from 'lucide-react';

const API_BASE = '/api';

// Общие заголовки для API запросов
function getApiHeaders(): HeadersInit {
 const headers: HeadersInit = {
 'Content-Type': 'application/json',
 };
  
 const botId = getBotIdFromUrl();
 if (botId) {
 headers['x-bot-id'] = String(botId);
 }
  
 const telegramId = getTelegramId();
 if (telegramId) {
 headers['x-telegram-id'] = String(telegramId);
 }
  
 return headers;
}

export default function BookingPage() {
  const theme = useTelegramTheme();
  const isDark = theme.bgColor !== '#ffffff';
  const setThemeMode = theme.setThemeMode;
  const [services, setServices] = useState<Service[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<Service | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Табы навигации: 'services' - услуги, 'bookings' - мои записи
  const [activeTab, setActiveTab] = useState<'services' | 'bookings'>('services');
  
  // Выбранная запись для просмотра деталей
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Записи пользователя
  const [myBookings, setMyBookings] = useState<{
    upcoming: Booking[];
    past: Booking[];
  }>({ upcoming: [], past: [] });
  const [bookingsLoading, setBookingsLoading] = useState(false);

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

  // === СТАБИЛЬНЫЕ CALLBACKS (добавлено для оптимизации) ===
  
  // Для ServiceCard - передаётся в список услуг
  const handleServiceSelect = useCallback((service: Service) => {
    setSelectedServiceForModal(service);
  }, []);

  // Для переключения табов
  const handleTabChange = useCallback((tab: 'services' | 'bookings') => {
    setActiveTab(tab);
  }, []);

  // Для открытия деталей записи
  const handleBookingClick = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
  }, []);

  // Для закрытия модалок
  const handleCloseModal = useCallback(() => {
    setSelectedServiceForModal(null);
    setSelectedBooking(null);
  }, []);

  // Для переключения темы
  const handleToggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  // Для подтверждения выбора услуги в модалке
  const handleServiceConfirm = useCallback((service: Service) => {
    setSelectedServiceForModal(null);
    selectService(service);
  }, [selectService]);

 // Загрузка услуг при старте
 useEffect(() => {
 const fetchServices = async () => {
 try {
 const res = await fetch(`${API_BASE}/services`, { headers: getApiHeaders() });
 const data = await res.json();
 setServices(data);
 } catch (err) {
 console.error('Failed to fetch services:', err);
 setError('Не удалось загрузить услуги');
 }
 };
 fetchServices();
 }, []);

 // Проверка админа
 useEffect(() => {
 const checkAdmin = async () => {
 const telegramId = getTelegramId();
 if (!telegramId) return;
 
 try {
 const res = await fetch(`${API_BASE}/admin/check`, { headers: getApiHeaders() });
 const data = await res.json();
 setIsAdmin(data.isAdmin || false);
 } catch (err) {
 console.error('Failed to check admin:', err);
 }
 };
 
 checkAdmin();
 }, []);

 // Загрузка записей пользователя
 const fetchMyBookings = useCallback(async () => {
 const telegramId = getTelegramId();
 if (!telegramId) return;
 
 setBookingsLoading(true);
 try {
 const res = await fetch(`${API_BASE}/my-bookings`, { headers: getApiHeaders() });
 const data = await res.json();
 setMyBookings({
 upcoming: data.upcoming || [],
 past: data.past || [],
 });
 } catch (err) {
 console.error('Failed to fetch bookings:', err);
 } finally {
 setBookingsLoading(false);
 }
 }, []);

 // При переключении на таб "Записи" - загружаем данные
 useEffect(() => {
 if (activeTab === 'bookings') {
 fetchMyBookings();
 }
 }, [activeTab, fetchMyBookings]);

  // Умная генерация слотов на клиенте
  const { 
    slots: generatedSlots, 
    loading: slotsLoading,
    refetch: refetchSlots 
  } = useTimeSlots({
    selectedDate,
    serviceDuration: selectedService?.duration || 60,
  });

  // Форматированная дата
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDate]);

  // Мемоизируем рендер списка услуг - НЕ создаём новый массив при каждом рендере
  const serviceCards = useMemo(() => 
    services.map((service, index) => (
      <ServiceCard
        key={service.id}
        service={service}
        onSelect={handleServiceSelect}
        index={index}
      />
    )), [services, handleServiceSelect]);

  // Обработка бронирования
  const handleBooking = useCallback(async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const telegramId = getTelegramId();
      
 const res = await fetch(`${API_BASE}/bookings`, {
 method: 'POST',
 headers: getApiHeaders(),
 body: JSON.stringify({
 serviceId: selectedService.id,
 serviceName: selectedService.name,
 date: dateStr,
 time: selectedSlot,
 duration: selectedService.duration,
 price: selectedService.price,
 telegramId,
 }),
 });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка бронирования');
      }

      setBookingSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка бронирования';
      
      // Если слот занят - сбрасываем выбор и возвращаем на выбор времени
      if (errorMessage.includes('no longer available') || errorMessage.includes('занят')) {
        setError('Время уже занято. Пожалуйста, выберите другое.');
        selectSlot(null); // Сбрасываем выбранный слот
        refetchSlots(); // Обновляем список слотов
        goBack(); // Возвращаем на экран выбора времени
      }
      // Если превышен лимит активных бронирований
      else if (errorMessage.includes('Maximum number of active bookings reached')) {
        setError('У вас уже есть максимальное количество активных записей. Отмените или перенесите текущую запись, чтобы создать новую.');
      }
      else {
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedService, selectedDate, selectedSlot, selectSlot, refetchSlots, goBack]);

  // Переинициализация при успешном бронировании
  const handleReset = useCallback(() => {
    setBookingSuccess(false);
    setError(null);
    reset();
  }, [reset]);

  // Ошибка при загрузке услуг
  if (error && step === 'services') {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          padding: '24px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: theme.bgColor,
        }}
      >
        <div style={{ 
          textAlign: 'center',
          background: isDark 
            ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
            : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
          backdropFilter: 'blur(24px)',
          borderRadius: '28px',
          padding: '40px 32px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
        }}>
          <p style={{ color: theme.buttonColor, marginBottom: '20px', fontSize: '16px', fontWeight: 500 }}>{error}</p>
          <Button onClick={() => window.location.reload()}>
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
        style={{ 
          minHeight: '100vh', 
          padding: '24px',
          backgroundColor: theme.bgColor,
          paddingTop: 'env(safe-area-inset-top, 24px)',
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        }}
      >
        <div 
          style={{ 
            maxWidth: '440px', 
            margin: '0 auto',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '80vh',
            animation: 'scaleIn 0.5s ease',
          }}
        >
          <div 
            className="glass-card"
            style={{ 
              textAlign: 'center',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
                : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
              backdropFilter: 'blur(24px)',
              borderRadius: '32px',
              padding: '56px 40px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
              boxShadow: isDark 
                ? '0 24px 64px rgba(0,0,0,0.6)' 
                : '0 24px 64px rgba(0,0,0,0.12)',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Декоративный фон */}
            <div style={{
              position: 'absolute',
              top: '-100px',
              left: '-100px',
              width: '200px',
              height: '200px',
              background: `radial-gradient(circle, ${theme.buttonColor}25 0%, transparent 70%)`,
              borderRadius: '50%',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: `radial-gradient(circle, ${theme.buttonColor}15 0%, transparent 70%)`,
              borderRadius: '50%',
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div 
                style={{ 
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 24px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${theme.buttonColor}40`,
                }}
              >
                <Check size={40} style={{ color: theme.buttonTextColor }} />
              </div>
              
              <h2 
                style={{ 
                  fontSize: '28px', 
                  fontWeight: 800,
                  marginBottom: '16px',
                  color: theme.textColor,
                  letterSpacing: '-0.5px',
                }}
              >
                Запись подтверждена
              </h2>
              <p style={{ color: theme.hintColor, fontSize: '16px', lineHeight: 1.6 }}>
                Мы ждем вас <br/>
                <span style={{ color: theme.textColor, fontWeight: 600 }}>{formattedDate}</span> в <span style={{ color: theme.textColor, fontWeight: 600 }}>{selectedSlot}</span>
              </p>
              <Button
                onClick={handleReset}
                style={{ marginTop: '36px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={18} />
                  Записаться снова
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        padding: '24px',
        backgroundColor: theme.bgColor,
        paddingTop: 'env(safe-area-inset-top, 24px)',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
      }}
    >
      <div style={{ maxWidth: '440px', margin: '0 auto', paddingBottom: '80px' }}>
        {/* Заголовок */}
        {step === 'services' && (
          <Greeting />
        )}

        {/* Навигация назад */}
        {step !== 'services' && <BackButton onClick={goBack} />}
        
        {/* Сообщение об ошибке */}
        {error && (
          <div 
            style={{
              marginBottom: '24px', 
              padding: '16px 20px',
              borderRadius: '16px',
              background: `${theme.buttonColor}15`,
              color: theme.buttonColor,
              fontSize: '14px',
              fontWeight: 500,
              border: `1px solid ${theme.buttonColor}20`,
            }}
          >
            {error}
          </div>
        )}

        {/* Контент в зависимости от активного таба */}
        {activeTab === 'services' ? (
          <>
            {/* ЭКРАН 1: Список услуг */}
            {step === 'services' && (
              <div 
                style={{ 
                  display: 'flex',
                  flexDirection: 'column', 
                  gap: '10px',
                }}
              >
                {serviceCards}
                {services.length === 0 && !error && (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '64px 0', 
                    color: theme.hintColor,
                  }}>
                    Загрузка услуг...
                  </div>
                )}
              </div>
            )}

            {/* ЭКРАН 2: Календарь и выбор времени */}
            {step === 'calendar' && selectedService && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Выбранная услуга */}
                <div 
                  style={{ 
                    borderRadius: '18px',
                    padding: '16px',
                    background: isDark 
                      ? 'rgba(35,35,35,0.9)' 
                      : 'rgba(255,255,255,0.9)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '15px' }}>
                      {selectedService.name}
                    </span>
                    <span style={{ color: theme.buttonColor, fontWeight: 700, fontSize: '18px' }}>
                      {selectedService.price} ₽
                    </span>
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
                    slots={generatedSlots}
                    selectedSlot={selectedSlot}
                    onSlotSelect={selectSlot}
                    loading={slotsLoading}
                  />
                )}
              </div>
            )}

            

            {/* ЭКРАН 3: Подтверждение */}
            {step === 'confirm' && selectedService && selectedDate && selectedSlot && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Карточка подтверждения */}
                <div 
                  className="glass-card"
                  style={{ 
                    borderRadius: '28px',
                    padding: '32px',
                    background: isDark 
                      ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
                      : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
                    backdropFilter: 'blur(24px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: isDark 
                      ? '0 16px 48px rgba(0,0,0,0.5)' 
                      : '0 16px 48px rgba(0,0,0,0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '100px',
                    height: '100px',
                    background: `radial-gradient(circle, ${theme.buttonColor}20 0%, transparent 70%)`,
                    borderRadius: '50%',
                  }} />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <h3 
                      style={{ 
                        textAlign: 'center',
                        fontSize: '22px', 
                        fontWeight: 700,
                        marginBottom: '28px',
                        color: theme.textColor,
                      }}
                    >
                      Подтвердите запись
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.hintColor}15` }}>
                        <span style={{ color: theme.hintColor, fontSize: '15px' }}>Услуга</span>
                        <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '15px' }}>{selectedService.name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.hintColor}15` }}>
                        <span style={{ color: theme.hintColor, fontSize: '15px' }}>Дата</span>
                        <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '15px' }}>{formattedDate}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.hintColor}15` }}>
                        <span style={{ color: theme.hintColor, fontSize: '15px' }}>Время</span>
                        <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '15px' }}>{selectedSlot}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                        <span style={{ color: theme.hintColor, fontSize: '15px', fontWeight: 500 }}>Итого</span>
                        <span style={{ fontWeight: 700, fontSize: '24px', color: theme.buttonColor }}>
                          {selectedService.price} ₽
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Кнопка подтверждения */}
                <Button
                  onClick={handleBooking}
                  loading={submitting}
                  size="lg"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Подтвердить запись
                    <ArrowRight size={20} />
                  </span>
                </Button>

                {/* Кнопка сброса */}
                <button
                  onClick={handleReset}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    padding: '16px',
                    color: theme.hintColor,
                    fontSize: '14px',
                    fontWeight: 500,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Начать заново
                </button>
              </div>
            )}
          </>
        ) : (
          /* Таб "Записи" - показываем записи пользователя */
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {bookingsLoading ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: theme.hintColor }}>
                Загрузка...
              </div>
            ) : myBookings.upcoming.length === 0 && myBookings.past.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: theme.hintColor }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <CalendarIcon size={48} style={{ opacity: 0.3 }} />
                </div>
                <p>У вас пока нет записей</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Предстоящие записи */}
                {myBookings.upcoming.length > 0 && (
                  <>
                    <h3 style={{ color: theme.textColor, fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                      Предстоящие
                    </h3>
                    {myBookings.upcoming.map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => handleBookingClick(booking)}
                        className="glass-card"
                        style={{ 
                          borderRadius: '18px',
                          padding: '18px',
                          background: isDark 
                            ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
                            : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
                          backdropFilter: 'blur(20px)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: theme.textColor, fontSize: '16px' }}>
                              {booking.serviceName}
                            </div>
                            <div style={{ fontSize: '14px', color: theme.hintColor, marginTop: '4px' }}>
                              {new Date(booking.date + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })} в {booking.time}
                            </div>
                          </div>
                          <span style={{ 
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(34,197,94,0.15)',
                            color: '#22c55e',
                          }}>
                            Подтверждено
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: theme.buttonColor, fontSize: '18px' }}>
                            {booking.price} ₽
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Прошедшие записи */}
                {myBookings.past.length > 0 && (
                  <>
                    <h3 style={{ color: theme.textColor, fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
                      Прошедшие
                    </h3>
                    {myBookings.past.map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => handleBookingClick(booking)}
                        className="glass-card"
                        style={{ 
                          borderRadius: '18px',
                          padding: '18px',
                          background: isDark 
                            ? 'rgba(35,35,35,0.6)' 
                            : 'rgba(255,255,255,0.6)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
                          opacity: 0.7,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: theme.textColor, fontSize: '15px' }}>
                              {booking.serviceName}
                            </div>
                            <div style={{ fontSize: '13px', color: theme.hintColor, marginTop: '4px' }}>
                              {new Date(booking.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в {booking.time}
                            </div>
                          </div>
                          <span style={{ 
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: theme.hintColor + '20',
                            color: theme.hintColor,
                          }}>
                            {booking.status === 'cancelled' ? 'Отменено' : 'Завершено'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модалка услуги */}
      {selectedServiceForModal && (
        <ServiceModal
          service={selectedServiceForModal}
          onSelect={handleServiceConfirm}
          onClose={handleCloseModal}
        />
      )}

      {/* Модалка деталей записи */}
      {selectedBooking && (
        <div 
          style={{ 
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
          onClick={handleCloseModal}
        >
          <div 
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
                : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
              backdropFilter: 'blur(24px)',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '360px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: theme.textColor, fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0' }}>
              Детали записи
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.hintColor}15` }}>
                <span style={{ color: theme.hintColor, fontSize: '14px' }}>Услуга</span>
                <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '14px' }}>{selectedBooking.serviceName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.hintColor}15` }}>
                <span style={{ color: theme.hintColor, fontSize: '14px' }}>Дата</span>
                <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '14px' }}>
                  {new Date(selectedBooking.date + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.hintColor}15` }}>
                <span style={{ color: theme.hintColor, fontSize: '14px' }}>Время</span>
                <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '14px' }}>{selectedBooking.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${theme.hintColor}15` }}>
                <span style={{ color: theme.hintColor, fontSize: '14px' }}>Длительность</span>
                <span style={{ fontWeight: 600, color: theme.textColor, fontSize: '14px' }}>{selectedBooking.duration} мин</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                <span style={{ color: theme.hintColor, fontSize: '14px', fontWeight: 500 }}>Стоимость</span>
                <span style={{ fontWeight: 700, fontSize: '22px', color: theme.buttonColor }}>
                  {selectedBooking.price} ₽
                </span>
              </div>
              <div style={{ 
                marginTop: '8px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: selectedBooking.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                textAlign: 'center',
              }}>
                <span style={{ 
                  color: selectedBooking.status === 'confirmed' ? '#22c55e' : theme.hintColor,
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {selectedBooking.status === 'confirmed' ? 'Подтверждено' : 
                   selectedBooking.status === 'cancelled_by_user' ? 'Отменено вами' :
                   selectedBooking.status === 'cancelled_by_admin' ? 'Отменено администратором' :
                   selectedBooking.status === 'cancelled' ? 'Отменено' : 'Завершено'}
                </span>
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '20px',
                borderRadius: '14px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                background: 'transparent',
                color: theme.hintColor,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Фиксированная панель навигации внизу */}
      <div 
        style={{
          position: 'fixed', 
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'auto',
          padding: '6px 10px',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
          background: isDark 
            ? 'rgba(30,30,30,0.65)' 
            : 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '18px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
          boxShadow: isDark 
            ? '0 6px 24px rgba(0,0,0,0.25)' 
            : '0 6px 24px rgba(0,0,0,0.06)',
          display: 'flex',
          gap: '6px',
          zIndex: 100,
        }}
      >
        <button
          onClick={() => handleTabChange('services')}
          style={{ 
            width: '72px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            padding: '8px 6px',
            borderRadius: '12px',
            background: activeTab === 'services' 
              ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
              : 'transparent',
            color: activeTab === 'services' 
              ? theme.buttonTextColor 
              : theme.hintColor,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Scissors size={16} />
          <span style={{ fontSize: '9px', fontWeight: 600 }}>Услуги</span>
        </button>
        
        <button
          onClick={() => handleTabChange('bookings')}
          style={{ 
            width: '72px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            padding: '8px 6px',
            borderRadius: '12px',
            background: activeTab === 'bookings' 
              ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
              : 'transparent',
            color: activeTab === 'bookings' 
              ? theme.buttonTextColor 
              : theme.hintColor,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <ClipboardList size={16} />
          <span style={{ fontSize: '9px', fontWeight: 600 }}>Записи</span>
        </button>
      </div>

      {/* Кнопка переключения темы - слева */}
      <div style={{ 
        position: 'fixed', 
        bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', 
        left: '16px',
        zIndex: 100,
      }}>
        <button
          onClick={handleToggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: isDark 
              ? 'rgba(30,30,30,0.65)' 
              : 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
            boxShadow: isDark 
              ? '0 4px 12px rgba(0,0,0,0.25)' 
              : '0 4px 12px rgba(0,0,0,0.06)',
            color: theme.hintColor,
            cursor: 'pointer',
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Кнопка админ-панели - справа */}
      {isAdmin && (
        <div style={{ 
          position: 'fixed', 
          bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', 
          right: '16px',
          zIndex: 100,
        }}>
          <a
            href={getUrlWithBotId('/admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isDark 
                ? 'rgba(30,30,30,0.65)' 
                : 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
              boxShadow: isDark 
                ? '0 4px 12px rgba(0,0,0,0.25)' 
                : '0 4px 12px rgba(0,0,0,0.06)',
              color: theme.hintColor,
              textDecoration: 'none',
            }}
          >
            <Settings size={18} />
          </a>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}