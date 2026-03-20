import { useState, useEffect, useMemo } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import type { Booking } from '../types/booking';
import { BackButton } from '../components/BackButton/BackButton';
import { Alert } from '../components/Alert/Alert';
import { Calendar as CalendarIcon, Clock, Scissors, X, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = '/api';

function getTelegramId(): number | undefined {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
}

// Формат даты
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Формат времени с окончанием
function formatTimeWithEnd(time: string, duration: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const endMins = hours * 60 + mins + duration;
  const endHours = Math.floor(endMins / 60);
  const endMinsRem = endMins % 60;
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinsRem).padStart(2, '0')}`;
  return `${time} - ${endTime}`;
}

// Мини-календарь для выбора даты
function MiniCalendar({ 
  selectedDate, 
  onSelect,
  isDark,
  theme,
}: { 
  selectedDate: Date | null; 
  onSelect: (date: Date) => void;
  isDark: boolean;
  theme: any;
}) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const result = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      result.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      result.push(new Date(year, month, i));
    }
    return result;
  }, [currentMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  return (
    <div>
      {/* Заголовок месяца */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={16} style={{ color: theme.hintColor }} />
        </button>
        <span style={{ color: theme.textColor, fontWeight: 600, fontSize: '14px' }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <ChevronRight size={16} style={{ color: theme.hintColor }} />
        </button>
      </div>

      {/* Дни недели */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontSize: '10px', color: theme.hintColor, padding: '4px' }}>
            {day}
          </div>
        ))}
      </div>

      {/* Дни */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {days.map((date, i) => {
          if (!date) return <div key={i} style={{ aspectRatio: '1' }} />;
          
          const isPast = date < today;
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === today.toDateString();
          
          return (
            <button
              key={i}
              onClick={() => !isPast && onSelect(date)}
              disabled={isPast}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                background: isSelected 
                  ? theme.buttonColor 
                  : isToday 
                    ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                    : 'transparent',
                color: isSelected 
                  ? theme.buttonTextColor 
                  : isPast 
                    ? theme.hintColor + '50'
                    : theme.textColor,
                border: 'none',
                cursor: isPast ? 'default' : 'pointer',
                opacity: isPast ? 0.3 : 1,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Модальное окно переноса
function RescheduleModal({ 
  booking, 
  onClose, 
  onSave,
  saving,
}: { 
  booking: Booking; 
  onClose: () => void; 
  onSave: (date: string, time: string) => void;
  saving: boolean;
}) {
  const theme = useTelegramTheme();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  // Загрузка слотов при выборе даты
  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const res = await fetch(`${API_BASE}/slots?date=${dateStr}&duration=${booking.duration}`);
        const slots = await res.json();
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Failed to fetch slots:', err);
        setError('Не удалось загрузить время');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, booking.duration]);

  const handleSave = () => {
    if (!selectedDate || !selectedTime) return;
    
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    onSave(dateStr, selectedTime);
  };

  return (
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
      onClick={onClose}
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
          Перенос записи
        </h3>

        <p style={{ color: theme.hintColor, fontSize: '13px', marginBottom: '16px' }}>
          {booking.serviceName} • {booking.duration} мин
        </p>

        {/* Календарь */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: theme.textColor, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Выберите дату:
          </p>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            isDark={isDark}
            theme={theme}
          />
        </div>

        {/* Время */}
        {selectedDate && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: theme.textColor, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              Выберите время:
            </p>
            {loadingSlots ? (
              <p style={{ color: theme.hintColor, fontSize: '13px' }}>Загрузка...</p>
            ) : error ? (
              <p style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>
            ) : availableSlots.length === 0 ? (
              <p style={{ color: theme.hintColor, fontSize: '13px' }}>Нет доступного времени</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxHeight: '150px', overflow: 'auto' }}>
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: `1px solid ${selectedTime === slot ? theme.buttonColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
                      background: selectedTime === slot ? `${theme.buttonColor}20` : 'transparent',
                      color: selectedTime === slot ? theme.buttonColor : theme.textColor,
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
              background: 'transparent',
              color: theme.hintColor,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedDate || !selectedTime || saving}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
              color: theme.buttonTextColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: (!selectedDate || !selectedTime || saving) ? 'not-allowed' : 'pointer',
              opacity: (!selectedDate || !selectedTime || saving) ? 0.6 : 1,
            }}
          >
            {saving ? 'Сохранение...' : 'Перенести'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BookingCardProps {
  booking: Booking;
  isPast?: boolean;
  onCancel?: (id: string) => void;
  onReschedule?: (booking: Booking) => void;
  cancelling?: boolean;
}

function BookingCard({ booking, isPast = false, onCancel, onReschedule, cancelling }: BookingCardProps) {
  const theme = useTelegramTheme();
  
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  const isCancelled = ['cancelled', 'cancelled_by_user', 'cancelled_by_admin'].includes(booking.status);
  const isUpcoming = !isPast && !isCancelled;

  return (
    <div
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
          : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: '16px',
        boxShadow: isDark 
          ? '0 4px 16px rgba(0,0,0,0.35)' 
          : '0 4px 16px rgba(0,0,0,0.06)',
        padding: '16px',
        opacity: isCancelled ? 0.5 : 1,
      }}
    >
      {/* Статус */}
      {isCancelled && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '12px',
        }}>
          <X size={12} />
          {booking.status === 'cancelled_by_user' ? 'Отменено вами' : 
           booking.status === 'cancelled_by_admin' ? 'Отменено администратором' : 
           'Отменено'}
        </div>
      )}

      {/* Услуга */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Scissors size={18} style={{ color: theme.buttonColor }} />
        </div>
        <div>
          <h3 style={{ 
            color: theme.textColor, 
            fontSize: '15px', 
            fontWeight: 600, 
            margin: 0 
          }}>
            {booking.serviceName}
          </h3>
          <span style={{ color: theme.hintColor, fontSize: '13px' }}>
            {booking.duration} мин • {booking.price} ₽
          </span>
        </div>
      </div>

      {/* Дата и время */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={16} style={{ color: theme.hintColor }} />
          <span style={{ color: theme.textColor, fontSize: '14px' }}>
            {formatDate(booking.date)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} style={{ color: theme.hintColor }} />
          <span style={{ color: theme.textColor, fontSize: '14px' }}>
            {formatTimeWithEnd(booking.time, booking.duration)}
          </span>
        </div>
      </div>

      {/* Кнопки действий */}
      {isUpcoming && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {onReschedule && (
            <button
              onClick={() => onReschedule(booking)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                background: 'transparent',
                color: theme.textColor,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Перенести
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'transparent',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 500,
                cursor: cancelling ? 'not-allowed' : 'pointer',
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? 'Отмена...' : 'Отменить'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyBookingsPage() {
  const theme = useTelegramTheme();
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  // Alert states
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    type: 'success' | 'error' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', type: 'info' });

  const showAlert = (title: string, message?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', confirmText?: string, onConfirm?: () => void) => {
    setAlertState({ isOpen: true, title, message, type, confirmText, onConfirm });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertState({ isOpen: true, title, message, type: 'warning', confirmText: 'Да', cancelText: 'Отмена', onConfirm });
  };

  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  // Загрузка записей
  useEffect(() => {
    const fetchBookings = async () => {
      const telegramId = getTelegramId();
      if (!telegramId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/my-bookings`, {
          headers: { 'x-telegram-id': String(telegramId) },
        });
        const data = await res.json();
        setUpcoming(data.upcoming || []);
        setPast(data.past || []);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Отмена записи с подтверждением
  const handleCancel = (bookingId: string) => {
    showConfirm(
      'Отменить запись?',
      'Вы уверены, что хотите отменить эту запись?',
      async () => {
        const telegramId = getTelegramId();
        console.log('[CANCEL] bookingId:', bookingId, 'telegramId:', telegramId);
        if (!telegramId) return;

        setCancelling(bookingId);
        try {
          const res = await fetch(`${API_BASE}/my-bookings/${bookingId}/cancel`, {
            method: 'PATCH',
            headers: { 'x-telegram-id': String(telegramId) },
          });

          console.log('[CANCEL] response status:', res.status);
          const data = await res.json();
          console.log('[CANCEL] response data:', data);

          if (res.ok) {
            const cancelled = upcoming.find(b => b.id === bookingId);
            if (cancelled) {
              setUpcoming(prev => prev.filter(b => b.id !== bookingId));
              // Используем статус от сервера
              setPast(prev => [{ ...cancelled, status: 'cancelled_by_user' }, ...prev]);
            }
            showAlert('Запись отменена', 'Ваша запись была успешно отменена', 'success');
          } else {
            showAlert('Ошибка', data.error || 'Не удалось отменить запись', 'error');
          }
        } catch (err) {
          console.error('Failed to cancel booking:', err);
          showAlert('Ошибка', 'Произошла ошибка при отмене записи', 'error');
        } finally {
          setCancelling(null);
        }
      }
    );
  };

  // Перенос записи - сначала получаем актуальные данные
  const handleReschedule = async (date: string, time: string) => {
    if (!rescheduleBooking) return;
    
    const telegramId = getTelegramId();
    console.log('[RESCHEDULE] bookingId:', rescheduleBooking.id, 'telegramId:', telegramId, 'date:', date, 'time:', time);
    if (!telegramId) return;

    setRescheduling(true);
    try {
      // Сначала получаем актуальные данные о записи
      const resBookings = await fetch(`${API_BASE}/my-bookings`, {
        headers: { 'x-telegram-id': String(telegramId) },
      });
      const data = await resBookings.json();
      console.log('[RESCHEDULE] all bookings:', data);
      const allBookings = [...(data.upcoming || []), ...(data.past || [])];
      const currentBooking = allBookings.find((b: Booking) => b.id === rescheduleBooking.id);
      
      console.log('[RESCHEDULE] currentBooking:', currentBooking);
      
      if (!currentBooking) {
        showAlert('Запись не найдена', 'Возможно, она была удалена или отменена', 'error');
        setRescheduleBooking(null);
        setRescheduling(false);
        return;
      }

      const res = await fetch(`${API_BASE}/my-bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-id': String(telegramId),
        },
        body: JSON.stringify({ date, time }),
      });

      console.log('[RESCHEDULE] response status:', res.status);
      const resData = await res.json();
      console.log('[RESCHEDULE] response data:', resData);

      if (res.ok) {
        const updated = await res.json();
        // Обновляем запись в списке
        setUpcoming(prev => prev.map(b => b.id === updated.id ? updated : b));
        setRescheduleBooking(null);
        showAlert('Запись перенесена', 'Ваша запись успешно перенесена на другую дату', 'success');
      } else {
        const err = await res.json();
        showAlert('Ошибка', err.error || 'Не удалось перенести запись', 'error');
      }
    } catch (err) {
      console.error('Failed to reschedule:', err);
      showAlert('Ошибка', 'Произошла ошибка при переносе записи', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          padding: '24px',
          backgroundColor: theme.bgColor,
          paddingTop: 'env(safe-area-inset-top, 24px)',
        }}
      >
        <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center', color: theme.hintColor }}>
          Загрузка...
        </div>
      </div>
    );
  }

  const currentBookings = activeTab === 'upcoming' ? upcoming : past;

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
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <BackButton onClick={() => window.history.back()} />

        {/* Заголовок */}
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 800, 
          color: theme.textColor,
          marginTop: '16px',
          marginBottom: '24px',
        }}>
          Мои записи
        </h1>

        {/* Табы */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '20px',
        }}>
          <button
            onClick={() => setActiveTab('upcoming')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'upcoming' 
                ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
              color: activeTab === 'upcoming' ? theme.buttonTextColor : theme.hintColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Предстоящие {upcoming.length > 0 && `(${upcoming.length})`}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'past' 
                ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
              color: activeTab === 'past' ? theme.buttonTextColor : theme.hintColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Прошедшие {past.length > 0 && `(${past.length})`}
          </button>
        </div>

        {/* Список записей */}
        {currentBookings.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: theme.hintColor,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <CalendarIcon size={48} style={{ opacity: 0.3 }} />
            </div>
            <p style={{ fontSize: '15px' }}>
              {activeTab === 'upcoming' 
                ? 'У вас нет предстоящих записей'
                : 'У вас нет прошедших записей'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                isPast={activeTab === 'past'}
                onCancel={activeTab === 'upcoming' ? handleCancel : undefined}
                onReschedule={activeTab === 'upcoming' ? () => setRescheduleBooking(booking) : undefined}
                cancelling={activeTab === 'upcoming' && cancelling === booking.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно переноса */}
      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onSave={handleReschedule}
          saving={rescheduling}
        />
      )}

      {/* Кастомный Alert */}
      <Alert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        onConfirm={alertState.onConfirm}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
