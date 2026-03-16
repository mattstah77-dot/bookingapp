import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const theme = useTelegramTheme();
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  const sizes = {
    sm: 'px-5 py-3 text-sm h-10',
    md: 'px-7 py-4 text-base h-12',
    lg: 'px-9 py-5 text-lg h-14',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}dd)`,
          color: theme.buttonTextColor,
          border: `1px solid ${theme.buttonColor}30`,
          boxShadow: isDark 
            ? `0 6px 24px ${theme.buttonColor}40, inset 0 1px 0 ${theme.buttonColor}30` 
            : `0 6px 24px ${theme.buttonColor}35`,
        };
      case 'secondary':
        return {
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(12px)',
          color: theme.textColor,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: isDark 
            ? '0 4px 16px rgba(0,0,0,0.3)' 
            : '0 4px 16px rgba(0,0,0,0.06)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: theme.hintColor,
          border: '1px solid transparent',
        };
      default:
        return {};
    }
  };

  return (
    <button
      className={sizes[size]}
      disabled={disabled || loading}
      style={{
        ...getVariantStyles(),
        ...style,
        borderRadius: '18px',
        fontWeight: 600,
        fontSize: size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px',
        letterSpacing: '0.3px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...props}
    >
      {loading && (
        <svg 
          className="animate-spin mr-2" 
          style={{ width: 18, height: 18 }} 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            style={{ opacity: 0.25 }} 
            cx="12" cy="12" r="10" 
            stroke="currentColor" 
            strokeWidth="3" 
          />
          <path 
            style={{ opacity: 0.75 }} 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
          />
        </svg>
      )}
      {children}
    </button>
  );
}
