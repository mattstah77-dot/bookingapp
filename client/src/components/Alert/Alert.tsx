import { useEffect, useState } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  isOpen: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export function Alert({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = 'ОК',
  cancelText,
  onConfirm,
  onCancel,
  onClose,
}: AlertProps) {
  const theme = useTelegramTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const isDark = theme.bgColor !== '#ffffff';

  const colors = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: CheckCircle },
    error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: XCircle },
    warning: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', icon: AlertTriangle },
    info: { bg: `${theme.buttonColor}20`, color: theme.buttonColor, icon: Info },
  };

  const { bg, color, icon: Icon } = colors[type];

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '24px',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.2s ease',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
            : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          padding: '24px',
          width: '100%',
          maxWidth: '320px',
          transform: isOpen ? 'scale(1)' : 'scale(0.9)',
          transition: 'transform 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Иконка */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '16px' 
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={28} style={{ color }} />
          </div>
        </div>

        {/* Заголовок */}
        <h3 style={{ 
          color: theme.textColor, 
          fontSize: '18px', 
          fontWeight: 700, 
          textAlign: 'center',
          margin: '0 0 8px 0',
        }}>
          {title}
        </h3>

        {/* Сообщение */}
        {message && (
          <p style={{ 
            color: theme.hintColor, 
            fontSize: '14px', 
            textAlign: 'center',
            margin: '0 0 24px 0',
            lineHeight: 1.5,
          }}>
            {message}
          </p>
        )}

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {cancelText && (
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '14px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                background: 'transparent',
                color: theme.hintColor,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: type === 'error' 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
              color: type === 'error' ? '#fff' : theme.buttonTextColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
