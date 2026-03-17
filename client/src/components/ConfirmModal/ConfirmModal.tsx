import { useTelegramTheme } from '../../hooks/useTelegram';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const theme = useTelegramTheme();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: theme.bgColor === '#ffffff' ? '#ffffff' : '#1a1a1a',
          borderRadius: '24px',
          padding: '24px',
          width: '100%',
          maxWidth: '340px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} style={{ color: theme.hintColor }} />
        </button>

        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: theme.textColor,
          marginBottom: '12px',
          marginTop: 0,
        }}>
          {title}
        </h3>

        <p style={{
          color: theme.hintColor,
          fontSize: '14px',
          lineHeight: 1.5,
          marginBottom: '24px',
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              border: `1px solid ${theme.hintColor}30`,
              background: 'transparent',
              color: theme.textColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: '#ef4444',
              color: '#ffffff',
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
