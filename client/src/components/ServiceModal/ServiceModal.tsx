import type { Service } from '../../types/booking';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { Button } from '../Button/Button';
import { Clock, Coins, Sparkles, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface ServiceModalProps {
  service: Service;
  onSelect: (service: Service) => void;
  onClose: () => void;
}

export function ServiceModal({ service, onSelect, onClose }: ServiceModalProps) {
  const theme = useTelegramTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // В будущем здесь будут реальные изображения
  const images: string[] = []; // Добавить URL изображений when админ загрузит
  
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(1, images.length));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.max(1, images.length)) % Math.max(1, images.length));
  };

  const hasImages = images.length > 0;

  return (
    <div 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1000,
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div 
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(40,40,40,0.98), rgba(25,25,25,0.98))' 
            : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.98))',
          backdropFilter: 'blur(24px)',
          borderRadius: '28px',
          padding: '24px',
          width: '100%',
          maxWidth: '380px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: isDark 
            ? '0 24px 64px rgba(0,0,0,0.6)' 
            : '0 24px 64px rgba(0,0,0,0.15)',
          animation: 'scaleIn 0.3s ease',
          position: 'relative',
        }}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.hintColor,
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
        >
          <X size={20} />
        </button>

        {/* Галерея / Заглушка для фото */}
        <div 
          style={{
            width: '100%',
            height: '180px',
            borderRadius: '20px',
            background: isDark 
              ? 'linear-gradient(135deg, rgba(60,60,60,0.8), rgba(40,40,40,0.8))' 
              : 'linear-gradient(135deg, rgba(240,240,240,0.8), rgba(230,230,230,0.8))',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {hasImages ? (
            // Реальные изображения
            <>
              <img 
                src={images[currentSlide]} 
                alt={service.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* Навигация */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={nextSlide}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                  {/* Индикаторы */}
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    {images.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.4)',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            // Заглушка - место для фото
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                color: theme.hintColor,
              }}
            >
              <ImageIcon size={40} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: '13px', opacity: 0.7 }}>Фото скоро появится</span>
            </div>
          )}
        </div>

        {/* Название */}
        <h2 
          style={{ 
            color: theme.textColor,
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '8px',
            paddingRight: '40px',
            lineHeight: 1.3,
          }}
        >
          {service.name}
        </h2>

        {/* Цена */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Coins size={22} style={{ color: theme.buttonColor }} />
          <span style={{ 
            color: theme.buttonColor, 
            fontSize: '28px', 
            fontWeight: 700,
          }}>
            {service.price.toLocaleString('ru-RU')} ₽
          </span>
        </div>

        {/* Описание */}
        {service.description && (
          <p 
            style={{ 
              color: theme.hintColor,
              fontSize: '15px',
              lineHeight: 1.6,
              marginBottom: '20px',
            }}
          >
            {service.description}
          </p>
        )}

        {/* Длительность */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            borderRadius: '16px',
            marginBottom: '24px',
          }}
        >
          <Clock size={22} style={{ color: theme.buttonColor }} />
          <span style={{ color: theme.textColor, fontSize: '16px', fontWeight: 600 }}>
            Длительность: {service.duration} минут
          </span>
        </div>

        {/* Кнопка */}
        <Button
          onClick={() => onSelect(service)}
          size="lg"
          style={{ width: '100%' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Sparkles size={20} />
            Выбрать услугу
          </span>
        </Button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0; 
            transform: scale(0.92); 
          }
          to { 
            opacity: 1; 
            transform: scale(1); 
          }
        }
      `}</style>
    </div>
  );
}