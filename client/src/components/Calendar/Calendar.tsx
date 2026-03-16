import { useState, useMemo } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { Button } from '../Button/Button';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const theme = useTelegramTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

    // Добавляем пустые дни в начале недели
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Добавляем дни месяца
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
      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-fade-in"
      style={{ 
        backgroundColor: theme.bgColor === '#ffffff' ? '#ffffff' : `${theme.bgColor}cc`,
        borderColor: theme.hintColor + '30',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevMonth}
          style={{ padding: '8px' }}
        >
          <svg className="w-5 h-5" fill="none" stroke={theme.textColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        <h3 
          className="text-lg font-semibold"
          style={{ color: theme.textColor }}
        >
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          style={{ padding: '8px' }}
        >
          <svg className="w-5 h-5" fill="none" stroke={theme.textColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div 
            key={day} 
            className="text-center text-xs font-medium py-2"
            style={{ color: theme.hintColor }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const past = isPast(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => !past && onDateSelect(date)}
              disabled={past}
              className={`
                aspect-square rounded-xl text-sm font-medium transition-all duration-200
                ${isSelected ? 'ring-2 ring-offset-2' : ''}
                ${past ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}
              `}
              style={{
                backgroundColor: isSelected 
                  ? theme.buttonColor 
                  : isToday 
                    ? `${theme.buttonColor}20`
                    : 'transparent',
                color: isSelected 
                  ? theme.buttonTextColor 
                  : past 
                    ? theme.hintColor 
                    : theme.textColor,
                boxShadow: isSelected ? `0 0 0 2px ${theme.bgColor}, 0 0 0 4px ${theme.buttonColor}` : undefined,
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
