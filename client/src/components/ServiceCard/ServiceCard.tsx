import type { Service } from '../../types/booking';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { Button } from '../Button/Button';
import { Clock, Coins } from 'lucide-react';

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
      className="service-card"
      style={{
        backgroundColor: isDark 
          ? `${theme.bgColor}f0` 
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderColor: `${theme.hintColor}20`,
        boxShadow: isDark 
          ? '0 8px 30px rgba(0,0,0,0.3)' 
          : '0 8px 30px rgba(0,0,0,0.08)',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Service Name */}
      <h3 
        className="text-xl font-semibold mb-1"
        style={{ color: theme.textColor }}
      >
        {service.name}
      </h3>
      
      {/* Description */}
      {service.description && (
        <p 
          className="text-sm mb-5"
          style={{ color: theme.hintColor }}
        >
          {service.description}
        </p>
      )}
      
      {/* Duration & Price */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock 
            size={16} 
            style={{ color: theme.hintColor }} 
          />
          <span className="text-sm font-medium" style={{ color: theme.hintColor }}>
            {service.duration} мин
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Coins 
            size={16} 
            style={{ color: theme.buttonColor }} 
          />
          <span className="text-base font-bold" style={{ color: theme.buttonColor }}>
            {service.price.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>
      
      {/* Select Button */}
      <Button
        onClick={() => onSelect(service)}
        style={{ 
          backgroundColor: theme.buttonColor,
          color: theme.buttonTextColor,
          width: '100%',
          boxShadow: `0 4px 14px ${theme.buttonColor}40`,
        }}
      >
        Выбрать
      </Button>

      <style>{`
        .service-card {
          border-radius: 20px;
          border: 1px solid;
          padding: 24px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: translateY(12px);
          animation: fadeInUp 0.4s ease forwards;
        }
        .service-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
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
