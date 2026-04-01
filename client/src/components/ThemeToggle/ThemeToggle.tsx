import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  setThemeMode: (mode: 'light' | 'dark') => void;
  isDark: boolean;
  buttonColor: string;
  hintColor: string;
  compact?: boolean;
}

export function ThemeToggle({ setThemeMode, isDark, buttonColor, hintColor, compact = false }: ThemeToggleProps) {
  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: '12px 16px',
          borderRadius: '18px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minWidth: '56px',
        }}
        title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      >
        {isDark ? (
          <Sun size={20} style={{ color: hintColor }} />
        ) : (
          <Moon size={20} style={{ color: hintColor }} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        borderRadius: '14px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
    >
      {isDark ? (
        <Sun size={20} style={{ color: buttonColor }} />
      ) : (
        <Moon size={20} style={{ color: hintColor }} />
      )}
    </button>
  );
}
