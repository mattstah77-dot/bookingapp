import { useState, useMemo, memo } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export const Calendar = memo(function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const theme = useTelegramTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const isDark = theme.bgColor !== '#ffffff';

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isPast = (date: Date): boolean => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly < today;
  };

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div 
      style={{ 
        background: isDark 
          ? 'rgba(35,35,35,0.9)' 
          : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '18px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={goToPrevMonth} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft size={20} style={{ color: theme.textColor }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={16} style={{ color: theme.buttonColor }} />
          <span style={{ color: theme.textColor, fontSize: '14px', fontWeight: 600 }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
        </div>

        <button onClick={goToNextMonth} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ChevronRight size={20} style={{ color: theme.textColor }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {weekDays.map(day => (
          <div 
            key={day} 
            style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: theme.hintColor, padding: '6px 0' }}
          >
            {day}
          </div>
        ))}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {daysInMonth.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} style={{ aspectRatio: '1' }} />;
          }

          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const past = isPast(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => !past && onDateSelect(date)}
              disabled={past}
              className={`calendar-day ${past ? 'calendar-day-disabled' : ''} ${isSelected ? 'calendar-day-selected' : ''} ${isToday ? 'calendar-day-today' : ''}`}
              style={{
                aspectRatio: '1',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: past ? 'default' : 'pointer',
                background: isSelected 
                  ? theme.buttonColor 
                  : isToday 
                    ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)')
                    : 'transparent',
                color: isSelected 
                  ? theme.buttonTextColor 
                  : past 
                    ? theme.hintColor 
                    : theme.textColor,
                border: 'none',
                opacity: past ? 0.4 : 1,
                touchAction: 'manipulation',
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
});