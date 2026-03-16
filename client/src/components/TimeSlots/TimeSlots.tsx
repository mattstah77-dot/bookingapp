import { useTelegramTheme } from '../../hooks/useTelegram';

interface TimeSlotsProps {
  slots: string[];
  selectedSlot: string | null;
  onSlotSelect: (slot: string) => void;
  loading?: boolean;
}

export function TimeSlots({ 
  slots, 
  selectedSlot, 
  onSlotSelect, 
  loading = false 
}: TimeSlotsProps) {
  const theme = useTelegramTheme();
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: theme.textColor }}
        >
          Доступное время
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-14 rounded-2xl"
            />
          ))}
        </div>

        <style>{`
          .skeleton {
            background: linear-gradient(90deg, ${theme.hintColor}15 25%, ${theme.hintColor}25 50%, ${theme.hintColor}15 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h3 
        className="text-lg font-semibold mb-4"
        style={{ color: theme.textColor }}
      >
        Доступное время
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot;
          
          return (
            <button
              key={slot}
              onClick={() => onSlotSelect(slot)}
              className="time-slot"
              style={{
                backgroundColor: isSelected 
                  ? theme.buttonColor 
                  : isDark 
                    ? `${theme.bgColor}f0` 
                    : 'rgba(255, 255, 255, 0.8)',
                color: isSelected 
                  ? theme.buttonTextColor 
                  : theme.textColor,
                borderColor: isSelected 
                  ? theme.buttonColor 
                  : `${theme.hintColor}20`,
                backdropFilter: 'blur(8px)',
                boxShadow: isDark 
                  ? '0 4px 12px rgba(0,0,0,0.2)' 
                  : '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>

      {slots.length === 0 && (
        <p 
          className="text-center py-6 text-base"
          style={{ color: theme.hintColor }}
        >
          Нет доступных слотов на выбранную дату
        </p>
      )}

      <style>{`
        .time-slot {
          height: 56px;
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 600;
          border: 1px solid;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .time-slot:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
        }
        .time-slot:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
