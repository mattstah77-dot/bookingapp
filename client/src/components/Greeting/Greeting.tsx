import { memo } from 'react';
import { useTelegramTheme, getGreeting } from '../../hooks/useTelegram';

export const Greeting = memo(function Greeting() {
  const theme = useTelegramTheme();
  const message = getGreeting();

  return (
    <div style={{ 
      marginBottom: '36px', 
      animation: 'fadeIn 0.5s ease',
      position: 'relative',
    }}>
      {/* Декоративная линия */}
      <div style={{
        width: '48px',
        height: '4px',
        background: `linear-gradient(90deg, ${theme.buttonColor}, ${theme.buttonColor}80)`,
        borderRadius: '2px',
        marginBottom: '16px',
      }} />
      
      <h1 
        style={{ 
          color: theme.textColor,
          fontSize: '32px',
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
        }}
      >
        {message}
      </h1>
      
      {/* Подзаголовок */}
      <p style={{ 
        color: theme.hintColor, 
        fontSize: '15px', 
        marginTop: '12px',
        fontWeight: 400,
      }}>
        Запись онлайн за несколько секунд
      </p>
    </div>
  );
});
