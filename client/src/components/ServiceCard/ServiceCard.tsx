import type { Service } from '../../types/booking';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { Button } from '../Button/Button';
import { Clock, Coins, Sparkles } from 'lucide-react';

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
          ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' 
          : '0 12px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: 0,
        transform: 'translateY(24px)',
        animation: `fadeInUp 0.6s ease forwards`,
        animationDelay: `${index * 100}ms`,
        marginBottom: '18px',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = isDark 
          ? '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 20px 50px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.95)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isDark 
          ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' 
          : '0 12px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)';
      }}
    >
      {/* Декоративный элемент */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        background: `radial-gradient(circle, ${theme.buttonColor}20 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 
          style={{ 
            color: theme.textColor,
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '6px',
            letterSpacing: '-0.3px',
          }}
        >
          {service.name}
        </h3>
        
        {service.description && (
          <p 
            style={{ 
              color: theme.hintColor,
              fontSize: '14px',
              marginBottom: '24px',
              lineHeight: 1.5,
            }}
          >
            {service.description}
          </p>
        )}
        
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            }}>
              <Clock size={18} style={{ color: theme.hintColor }} />
            </div>
            <span style={{ color: theme.hintColor, fontSize: '15px', fontWeight: 500 }}>
              {service.duration} мин
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '10px',
              background: `${theme.buttonColor}20`,
            }}>
              <Coins size={18} style={{ color: theme.buttonColor }} />
            </div>
            <span style={{ 
              color: theme.buttonColor, 
              fontSize: '22px', 
              fontWeight: 700,
            }}>
              {service.price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
        
        <Button
          onClick={() => onSelect(service)}
          style={{ 
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Sparkles size={18} />
            Выбрать услугу
          </span>
        </Button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
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
