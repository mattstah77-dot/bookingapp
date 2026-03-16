import { useState, useEffect, useMemo } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import { Calendar } from '../components/Calendar/Calendar';
import { Button } from '../components/Button/Button';
import { ChevronLeft, ChevronRight, CalendarDays, Users, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled';
  clientName?: string;
  clientPhone?: string;
  createdAt: string;
}

const API_BASE = '/api';

export default function AdminPage() {
  const theme = useTelegramTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState<Record<string, number>>({});

  // Определение темной темы
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  // Загружаем даты с бронированиями для календаря
  useEffect(() => {
    const fetchBookedDates = async () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
      
      try {
        const res = await fetch(`${API_BASE}/admin/bookings/dates?startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        setBookedDates(data);
      } catch (err) {
        console.error('Failed to fetch dates:', err);
      }
    };
    
    fetchBookedDates();
  }, [currentMonth]);

  // Загружаем бронирования
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/admin/bookings?`;
        if (selectedDate) {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          url += `date=${dateStr}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        setBookings(data);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [selectedDate]);

  // Фильтрованные бронирования
  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  }, [bookings, filter]);

  // Статистика
  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const totalRevenue = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.price, 0);
    return { confirmed, cancelled, total: bookings.length, totalRevenue };
  }, [bookings]);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Изменение статуса
  const handleStatusChange = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await fetch(`${API_BASE}/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Удаление
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;
    
    try {
      await fetch(`${API_BASE}/admin/bookings/${id}`, { method: 'DELETE' });
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Переход к предыдущему/следующему месяцу
  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

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
        <div className="mb-6">
          <h1 
            className="text-2xl font-semibold"
            style={{ color: theme.textColor }}
          >
            Админ-панель
          </h1>
          <p style={{ color: theme.hintColor }}>Управление записями</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div 
            className="rounded-2xl p-4"
            style={{ 
              backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.5)',
              border: `1px solid ${theme.hintColor}20`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={18} style={{ color: '#22c55e' }} />
              <span className="text-sm" style={{ color: theme.hintColor }}>Подтверждено</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: theme.textColor }}>
              {stats.confirmed}
            </span>
          </div>
          
          <div 
            className="rounded-2xl p-4"
            style={{ 
              backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.5)',
              border: `1px solid ${theme.hintColor}20`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={18} style={{ color: '#ef4444' }} />
              <span className="text-sm" style={{ color: theme.hintColor }}>Отменено</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: theme.textColor }}>
              {stats.cancelled}
            </span>
          </div>
        </div>

        {/* Мини-календарь */}
        <div 
          className="rounded-2xl p-4 mb-6"
          style={{ 
            backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.5)',
            border: `1px solid ${theme.hintColor}20`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={goToPrevMonth} style={{ padding: 8 }}>
              <ChevronLeft size={20} style={{ color: theme.textColor }} />
            </button>
            <span className="font-semibold" style={{ color: theme.textColor }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button onClick={goToNextMonth} style={{ padding: 8 }}>
              <ChevronRight size={20} style={{ color: theme.textColor }} />
            </button>
          </div>
          
          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="text-center text-xs font-medium" style={{ color: theme.hintColor }}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Дни месяца */}
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const year = currentMonth.getFullYear();
              const month = currentMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
              
              const days = [];
              for (let i = 0; i < startDayOfWeek; i++) {
                days.push(<div key={`empty-${i}`} />);
              }
              
              for (let i = 1; i <= lastDay.getDate(); i++) {
                const date = new Date(year, month, i);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const hasBookings = bookedDates[dateStr] > 0;
                const isSelected = selectedDate && 
                  selectedDate.getDate() === i && 
                  selectedDate.getMonth() === month && 
                  selectedDate.getFullYear() === year;
                const isToday = new Date().getDate() === i && 
                  new Date().getMonth() === month && 
                  new Date().getFullYear() === year;
                
                days.push(
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className="aspect-square rounded-xl flex items-center justify-center text-sm relative"
                    style={{
                      backgroundColor: isSelected ? theme.buttonColor : isToday ? `${theme.buttonColor}20` : 'transparent',
                      color: isSelected ? theme.buttonTextColor : theme.textColor,
                    }}
                  >
                    {i}
                    {hasBookings && (
                      <span 
                        className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                        style={{ backgroundColor: theme.buttonColor }}
                      />
                    )}
                  </button>
                );
              }
              
              return days;
            })()}
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex gap-2 mb-4">
          {(['all', 'confirmed', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === f ? theme.buttonColor : 'transparent',
                color: filter === f ? theme.buttonTextColor : theme.hintColor,
                border: `1px solid ${filter === f ? theme.buttonColor : theme.hintColor}30`,
              }}
            >
              {f === 'all' ? 'Все' : f === 'confirmed' ? 'Подтверждённые' : 'Отменённые'}
            </button>
          ))}
        </div>

        {/* Список бронирований */}
        {loading ? (
          <div className="text-center py-8" style={{ color: theme.hintColor }}>
            Загрузка...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-8" style={{ color: theme.hintColor }}>
            Нет записей
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map(booking => (
              <div
                key={booking.id}
                className="rounded-2xl p-4"
                style={{ 
                  backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${theme.hintColor}20`,
                  opacity: booking.status === 'cancelled' ? 0.6 : 1,
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold" style={{ color: theme.textColor }}>
                      {booking.serviceName}
                    </div>
                    <div className="text-sm" style={{ color: theme.hintColor }}>
                      {formatDate(booking.date)} в {booking.time}
                    </div>
                  </div>
                  <div 
                    className="px-2 py-1 rounded-lg text-xs font-medium"
                    style={{ 
                      backgroundColor: booking.status === 'confirmed' ? '#22c55e20' : '#ef444420',
                      color: booking.status === 'confirmed' ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {booking.status === 'confirmed' ? 'Подтверждено' : 'Отменено'}
                  </div>
                </div>
                
                {booking.clientName && (
                  <div className="text-sm mb-2" style={{ color: theme.hintColor }}>
                    Клиент: {booking.clientName}
                    {booking.clientPhone && ` • ${booking.clientPhone}`}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="font-bold" style={{ color: theme.buttonColor }}>
                    {booking.price} ₽
                  </span>
                  
                  <div className="flex gap-2">
                    {booking.status === 'confirmed' ? (
                      <button
                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: '#ef444420' }}
                        title="Отменить"
                      >
                        <XCircle size={18} style={{ color: '#ef4444' }} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(booking.id, 'confirmed')}
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: '#22c55e20' }}
                        title="Подтвердить"
                      >
                        <CheckCircle size={18} style={{ color: '#22c55e' }} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(booking.id)}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: '#ef444420' }}
                      title="Удалить"
                    >
                      <Trash2 size={18} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
