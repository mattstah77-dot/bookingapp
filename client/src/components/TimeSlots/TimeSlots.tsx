import { useTelegramTheme } from '../../hooks/useTelegram';
import { Clock } from 'lucide-react';

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
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Clock size={20} style={{ color: theme.buttonColor }} />
          <h3 style={{ color: theme.textColor, fontSize: '18px', fontWeight: 700 }}>
            Доступное время
          </h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '60px',
                borderRadius: '16px',
                background: isDark 
                  ? 'linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 75%)'
                  : 'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.07) 50%, rgba(0,0,0,0.04) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Clock size={20} style={{ color: theme.buttonColor }} />
        <h3 style={{ color: theme.textColor, fontSize: '18px', fontWeight: 700 }}>
          Доступное время
        </h3>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot;
          
          return (
            <button
              key={slot}
              onClick={() => onSlotSelect(slot)}
              style={{
                height: '60px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isSelected 
                  ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                  : isDark 
                    ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
                backdropFilter: 'blur(16px)',
                color: isSelected 
                  ? theme.buttonTextColor 
                  : theme.textColor,
                border: `1px solid ${isSelected ? 'transparent' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)')}`,
                boxShadow: isSelected 
                  ? `0 6px 20px ${theme.buttonColor}45` 
                  : (isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.06)'),
                cursor: 'pointer',
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>

      {slots.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0', 
          color: theme.hintColor, 
          fontSize: '15px',
          background: isDark 
            ? 'rgba(35,35,35,0.5)' 
            : 'rgba(255,255,255,0.5)',
          borderRadius: '16px',
          marginTop: '8px',
        }}>
          Нет доступных слотов на выбранную дату
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
