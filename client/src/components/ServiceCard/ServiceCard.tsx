import type { Service } from '../../types/booking';
import { useTelegramTheme } from '../../hooks/useTelegram';

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  index?: number;
}

export function ServiceCard({ service, onSelect, index = 0 }: ServiceCardProps) {
  const theme = useTelegramTheme();
  
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  return (
    <div 
      onClick={() => onSelect(service)}
      className="glass-card"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
          : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: '20px',
        padding: '18px',
        boxShadow: isDark 
          ? '0 6px 24px rgba(0,0,0,0.45)' 
          : '0 6px 24px rgba(0,0,0,0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: 0,
        transform: 'translateY(16px)',
        animation: `fadeInUp 0.4s ease forwards`,
        animationDelay: `${index * 50}ms`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '90px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Декоративный элемент */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '60px',
        height: '60px',
        background: `radial-gradient(circle, ${theme.buttonColor}12 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 
          style={{ 
            color: theme.textColor,
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.2px',
            lineHeight: 1.3,
            marginBottom: '12px',
          }}
        >
          {service.name}
        </h3>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ 
          color: theme.buttonColor, 
          fontSize: '20px', 
          fontWeight: 700,
        }}>
          {service.price.toLocaleString('ru-RU')} ₽
        </span>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}