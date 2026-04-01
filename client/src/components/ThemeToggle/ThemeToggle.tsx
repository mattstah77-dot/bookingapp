import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  setThemeMode: (mode: 'light' | 'dark') => void;
  isDark: boolean;
  buttonColor: string;
  hintColor: string;
}

export function ThemeToggle({ setThemeMode, isDark, buttonColor, hintColor }: ThemeToggleProps) {
  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    alert('Toggle clicked! isDark: ' + isDark + ', will switch to: ' + newMode);
    console.log('[ThemeToggle] Before setThemeMode, isDark:', isDark);
    setThemeMode(newMode);
    console.log('[ThemeToggle] After setThemeMode called');
  };

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
        pointerEvents: 'auto',
        position: 'relative',
        zIndex: 50,
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
