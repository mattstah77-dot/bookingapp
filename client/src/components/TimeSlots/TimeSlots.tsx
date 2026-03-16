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
              className="skeleton h-12 rounded-xl"
            />
          ))}
        </div>

        <style>{`
          .skeleton {
            background: linear-gradient(90deg, ${theme.hintColor}20 25%, ${theme.hintColor}30 50%, ${theme.hintColor}20 75%);
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
              className={`
                h-12 rounded-xl text-base font-medium transition-all duration-200
                ${isSelected ? 'ring-2 ring-offset-2' : 'hover:scale-105'}
              `}
              style={{
                backgroundColor: isSelected 
                  ? theme.buttonColor 
                  : theme.bgColor === '#ffffff' ? '#f8fafc' : `${theme.bgColor}80`,
                color: isSelected 
                  ? theme.buttonTextColor 
                  : theme.textColor,
                borderColor: theme.hintColor + '30',
                border: '1px solid',
                boxShadow: isSelected ? `0 0 0 2px ${theme.bgColor}, 0 0 0 4px ${theme.buttonColor}` : undefined,
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>

      {slots.length === 0 && (
        <p 
          className="text-center py-4"
          style={{ color: theme.hintColor }}
        >
          Нет доступных слотов на выбранную дату
        </p>
      )}
    </div>
  );
}
