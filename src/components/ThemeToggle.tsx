import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd') {
        const activeElement = document.activeElement;
        const isInput = activeElement && (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) || 
          (activeElement as HTMLElement).isContentEditable
        );

        if (!isInput) {
          const isDark = document.documentElement.classList.contains('dark');
          const newTheme = isDark ? 'light' : 'dark';
          
          if (!(e as any).__themeToggled) {
            (e as any).__themeToggled = true;
            setThemeMode(newTheme);
          }
        }
      }
    };

    const handleSync = (e: any) => {
      setTheme(e.detail);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('theme-sync', handleSync);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('theme-sync', handleSync);
    };
  }, []);

  const setThemeMode = (mode: 'light' | 'dark') => {
    setTheme(mode);
    localStorage.setItem('theme', mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
    window.dispatchEvent(new CustomEvent('theme-sync', { detail: mode }));
  };

  if (!theme) return <div className="w-[72px] h-9 bg-canvas-soft border border-hairline rounded-pill animate-pulse" />;

  return (
    <div className="relative flex items-center p-1 bg-canvas-soft border border-hairline rounded-pill shadow-inset group/toggle">
      {/* Sliding Highlight - Tactile & Premium */}
      <motion.div
        className="absolute h-7 w-[32px] bg-canvas border border-hairline shadow-premium-sm rounded-pill z-0 after:absolute after:inset-0 after:rounded-pill after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] dark:after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
        initial={false}
        animate={{
          x: theme === 'light' ? 0 : 32,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />

      <button
        onClick={() => setThemeMode('light')}
        className={`relative z-10 flex items-center justify-center w-8 h-7 rounded-pill transition-all duration-300 group/btn ${
          theme === 'light' ? 'text-ink' : 'text-mute hover:text-ink'
        }`}
        aria-label="Light Mode"
      >
        <Sun className={`w-3.5 h-3.5 transition-all duration-500 ${
          theme === 'light' ? 'scale-110 rotate-0' : 'scale-75 -rotate-12 opacity-50 group-hover/btn:opacity-100 group-hover/btn:scale-90 group-hover/btn:rotate-0'
        }`} />
      </button>

      <button
        onClick={() => setThemeMode('dark')}
        className={`relative z-10 flex items-center justify-center w-8 h-7 rounded-pill transition-all duration-300 group/btn ${
          theme === 'dark' ? 'text-ink' : 'text-mute hover:text-ink'
        }`}
        aria-label="Dark Mode"
      >
        <Moon className={`w-3.5 h-3.5 transition-all duration-500 ${
          theme === 'dark' ? 'scale-110 rotate-0' : 'scale-75 rotate-12 opacity-50 group-hover/btn:opacity-100 group-hover/btn:scale-90 group-hover/btn:rotate-0'
        }`} />
      </button>
    </div>
  );
};



