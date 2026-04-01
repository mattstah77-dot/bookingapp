import { memo } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

export const BackButton = memo(function BackButton({ onClick }: BackButtonProps) {
  const theme = useTelegramTheme();
  
  const isDark = theme.bgColor !== '#ffffff';

  return (
    <button
      onClick={onClick}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        padding: '16px 8px',
        marginBottom: '24px',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        border: 'none',
        cursor: 'pointer',
        color: theme.linkColor,
      }}
    >
      <ArrowLeft size={20} />
      <span style={{ fontSize: '15px', fontWeight: 600 }}>Назад</span>
    </button>
  );
});
