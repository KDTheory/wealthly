import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const KEY = 'wealthly-theme';

function readTheme() {
  if (typeof document === 'undefined') return 'light';
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'light' || explicit === 'dark') return explicit;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);
  return [theme, setTheme];
}

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className={`ds-icon-btn ${className}`}
      onClick={() => setTheme(next)}
      title={`Passer en mode ${next === 'dark' ? 'sombre' : 'clair'}`}
      aria-label="Basculer le thème"
    >
      {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
    </button>
  );
}
