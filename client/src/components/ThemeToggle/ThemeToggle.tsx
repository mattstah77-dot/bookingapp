import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  theme: {
    textColor: string;
    hintColor: string;
    buttonColor: string;
  };
  isDark: boolean;
}

export function ThemeToggle({ themeMode, setThemeMode, theme, isDark }: ThemeToggleProps) {
  const options = [
    { value: 'light', icon: Sun, label: 'Светлая' },
    { value: 'dark', icon: Moon, label: 'Тёмная' },
    { value: 'system', icon: Monitor, label: 'Системная' },
  ] as const;

  return (
    <div style={{ display: 'flex', gap: '6px', padding: '4px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: '12px' }}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = themeMode === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setThemeMode(option.value)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              borderRadius: '10px',
              border: 'none',
              background: isActive ? theme.buttonColor : 'transparent',
              color: isActive ? '#ffffff' : theme.hintColor,
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={option.label}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
