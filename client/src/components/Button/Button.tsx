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
  
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  
  const sizes = {
    sm: 'px-4 py-2.5 text-sm h-10',
    md: 'px-6 py-3.5 text-base h-12',
    lg: 'px-8 py-4 text-lg h-14',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.buttonColor,
          color: theme.buttonTextColor,
          boxShadow: `0 4px 14px ${theme.buttonColor}40`,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: theme.textColor,
          border: `1px solid ${theme.hintColor}30`,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: theme.hintColor,
        };
      default:
        return {};
    }
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      style={{ ...getVariantStyles(), ...style }}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
