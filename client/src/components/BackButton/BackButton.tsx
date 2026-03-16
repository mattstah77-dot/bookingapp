import { useTelegramTheme } from '../../hooks/useTelegram';

interface BackButtonProps {
  onClick: () => void;
}

export function BackButton({ onClick }: BackButtonProps) {
  const theme = useTelegramTheme();

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 mb-4 transition-colors duration-200 hover:opacity-70"
      style={{ color: theme.linkColor }}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm font-medium">Назад</span>
    </button>
  );
}
