import { useTelegramTheme } from '../../hooks/useTelegram';
import { Clock } from 'lucide-react';
import { useRef, memo } from 'react';
import type { TimeSlot } from '../../utils/timeSlots';

interface TimeSlotsProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSlotSelect: (slot: string) => void;
  loading?: boolean;
}

export const TimeSlots = memo(function TimeSlots({ 
  slots, 
  selectedSlot, 
  onSlotSelect, 
  loading = false 
}: TimeSlotsProps) {
  const theme = useTelegramTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isDark = theme.bgColor !== '#ffffff';

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={20} style={{ color: theme.buttonColor }} />
          <h3 style={{ color: theme.textColor, fontSize: '18px', fontWeight: 700 }}>
            Доступное время
          </h3>
        </div>
        
        {slots.length > 4 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => scroll('left')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.textColor,
              }}
            >
              ←
            </button>
            <button
              onClick={() => scroll('right')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.textColor,
              }}
            >
              →
            </button>
          </div>
        )}
      </div>
      
      {/* Горизонтальная карусель */}
      <div 
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '8px',
          marginBottom: '-8px',
          minHeight: '48px',
        }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                minWidth: '80px',
                height: '48px',
                borderRadius: '14px',
                background: isDark 
                  ? 'rgba(255,255,255,0.08)' 
                  : 'rgba(0,0,0,0.04)',
                flexShrink: 0,
              }}
            />
          ))
        ) : (
          slots.map((slot) => {
            const isSelected = selectedSlot === slot.time;
            const isAvailable = slot.available;
            
            return (
              <button
                key={slot.time}
                onClick={() => isAvailable && onSlotSelect(slot.time)}
                disabled={!isAvailable}
                className={`time-slot ${isSelected ? 'time-slot-selected' : ''} ${!isAvailable ? 'time-slot-disabled' : ''}`}
                style={{
                  minWidth: '80px',
                  height: '48px',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '0 16px',
                  background: isSelected 
                    ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                    : isAvailable
                      ? isDark 
                        ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))'
                      : isDark
                        ? 'rgba(35,35,35,0.5)'
                        : 'rgba(0,0,0,0.03)',
                  backdropFilter: 'blur(16px)',
                  color: isSelected 
                    ? theme.buttonTextColor 
                    : isAvailable
                      ? theme.textColor
                      : theme.hintColor,
                  border: `1px solid ${isSelected ? 'transparent' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)')}`,
                  boxShadow: isSelected 
                    ? `0 4px 12px ${theme.buttonColor}40` 
                    : (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)'),
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                  opacity: isAvailable ? 1 : 0.5,
                  touchAction: 'manipulation',
                }}
              >
                {slot.time}
              </button>
            );
          })
        )}
      </div>

      {slots.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '12px 0', 
          color: theme.hintColor, 
          fontSize: '14px',
        }}>
          Нет доступных слотов
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
});