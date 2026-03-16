import { useState, useMemo } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { Button } from '../Button/Button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const theme = useTelegramTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

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
      className="glass-card"
      style={{ 
        background: isDark 
          ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
          : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: '28px',
        padding: '28px',
        boxShadow: isDark 
          ? '0 12px 40px rgba(0,0,0,0.5)' 
          : '0 12px 40px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Декоративный элемент */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        left: '-40px',
        width: '120px',
        height: '120px',
        background: `radial-gradient(circle, ${theme.buttonColor}15 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <Button variant="ghost" size="sm" onClick={goToPrevMonth} style={{ padding: '14px' }}>
            <ChevronLeft size={26} style={{ color: theme.textColor }} />
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarDays size={22} style={{ color: theme.buttonColor }} />
            <h3 style={{ color: theme.textColor, fontSize: '18px', fontWeight: 700 }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
          </div>

          <Button variant="ghost" size="sm" onClick={goToNextMonth} style={{ padding: '14px' }}>
            <ChevronRight size={26} style={{ color: theme.textColor }} />
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '14px' }}>
          {weekDays.map(day => (
            <div 
              key={day} 
              style={{ 
                textAlign: 'center', 
                padding: '12px 0',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.hintColor,
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
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
                style={{
                  aspectRatio: '1',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: past ? 'default' : 'pointer',
                  background: isSelected 
                    ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                    : isToday 
                      ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)')
                      : 'transparent',
                  color: isSelected 
                    ? theme.buttonTextColor 
                    : past 
                      ? theme.hintColor 
                      : theme.textColor,
                  border: 'none',
                  opacity: past ? 0.35 : 1,
                  boxShadow: isSelected 
                    ? `0 6px 16px ${theme.buttonColor}40` 
                    : 'none',
                  position: 'relative',
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
