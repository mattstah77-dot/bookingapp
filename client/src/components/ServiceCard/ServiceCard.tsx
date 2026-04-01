import { memo } from 'react';
import type { Service } from '../../types/booking';
import { useTelegramTheme } from '../../hooks/useTelegram';

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  index?: number;
}

export const ServiceCard = memo(function ServiceCard({ service, onSelect, index = 0 }: ServiceCardProps) {
  const theme = useTelegramTheme();
  
  const isDark = theme.bgColor !== '#ffffff';

  const photos = service.photos;
  const hasPhotos = Array.isArray(photos) && photos.length > 0 && photos[0];

  return (
    <div 
      onClick={() => onSelect(service)}
      className="glass-card card-press card-hover"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
          : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: '16px',
        boxShadow: isDark 
          ? '0 4px 16px rgba(0,0,0,0.35)' 
          : '0 4px 16px rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: 0,
        transform: 'translateY(8px)',
        animation: `fadeInUp 0.4s ease forwards`,
        animationDelay: `${index * 40}ms`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        gap: '12px',
        minHeight: '52px',
      }}
    >
      {/* Фото */}
      {hasPhotos && photos && (
        <div 
          style={{ 
            width: '48px',
            height: '48px',
            overflow: 'hidden',
            borderRadius: '10px',
            flexShrink: 0,
          }}
        >
          <img 
            src={photos[0]} 
            alt={service.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}
      
      {/* Название - слева */}
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
      }}>
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
        
        <h3 
          style={{ 
            color: theme.textColor,
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '-0.2px',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {service.name}
        </h3>
      </div>

      {/* Цена и длительность - справа */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <span style={{ 
          color: theme.buttonColor, 
          fontSize: '14px', 
          fontWeight: 700,
        }}>
          {service.price.toLocaleString('ru-RU')} ₽
        </span>
        <span style={{ 
          color: theme.hintColor, 
          fontSize: '11px',
        }}>
          {service.duration} мин
        </span>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});