import type { Service } from '../../types/booking';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { Button } from '../Button/Button';

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  const theme = useTelegramTheme();

  return (
    <div 
      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-200 animate-fade-in"
      style={{ 
        backgroundColor: theme.bgColor === '#ffffff' ? '#ffffff' : `${theme.bgColor}cc`,
        borderColor: theme.hintColor + '30',
      }}
    >
      {/* Service Name */}
      <h3 
        className="text-lg font-semibold mb-1"
        style={{ color: theme.textColor }}
      >
        {service.name}
      </h3>
      
      {/* Description */}
      {service.description && (
        <p 
          className="text-sm mb-4"
          style={{ color: theme.hintColor }}
        >
          {service.description}
        </p>
      )}
      
      {/* Duration & Price */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke={theme.hintColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm" style={{ color: theme.hintColor }}>
            {service.duration} мин
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke={theme.hintColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium" style={{ color: theme.buttonColor }}>
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
        }}
      >
        Выбрать
      </Button>
    </div>
  );
}
