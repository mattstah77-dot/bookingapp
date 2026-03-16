import { useTelegramTheme } from '../../hooks/useTelegram';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

export function BackButton({ onClick }: BackButtonProps) {
  const theme = useTelegramTheme();

  return (
    <button
      onClick={onClick}
      className="back-button"
      style={{ color: theme.linkColor }}
    >
      <ChevronLeft size={22} />
      <span className="text-base font-medium">Назад</span>

      <style>{`
        .back-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 4px;
          margin-bottom: 16px;
          border-radius: 12px;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .back-button:hover {
          background: ${theme.linkColor}10;
        }
        .back-button:active {
          transform: scale(0.98);
        }
      `}</style>
    </button>
  );
}
