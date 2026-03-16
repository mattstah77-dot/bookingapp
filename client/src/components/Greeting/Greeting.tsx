import { useTelegramTheme, getGreeting } from '../../hooks/useTelegram';

export function Greeting() {
  const theme = useTelegramTheme();
  const message = getGreeting();

  return (
    <div 
      className="mb-6 animate-fade-in"
    >
      <h1 
        className="text-2xl font-semibold leading-tight"
        style={{ color: theme.textColor }}
      >
        {message}
      </h1>
    </div>
  );
}
