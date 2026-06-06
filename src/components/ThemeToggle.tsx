import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const getInitialTheme = () => {
      try {
        const saved = localStorage.getItem('theme');
        const userSet = localStorage.getItem('theme-user-set');
        if ((saved === 'dark' || saved === 'light') && userSet === 'true') return saved;
      } catch (e) {}
      if (document.documentElement.classList.contains('dark')) return 'dark';
      return 'light';
    };

    const initialTheme = getInitialTheme();
    setTheme(initialTheme);

    // Ensure global variable is in sync
    if (typeof window !== 'undefined') {
      (window as any).__theme = initialTheme;
    }

    // System theme change listener - only applies if no manual preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('theme');
        if (saved !== 'dark' && saved !== 'light') {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      } catch (err) {
        applyTheme(e.matches ? 'dark' : 'light', false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd') {
        const activeElement = document.activeElement;
        const isInput = activeElement && (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) || 
          (activeElement as HTMLElement).isContentEditable
        );

        if (!isInput) {
          const isDarkNow = document.documentElement.classList.contains('dark');
          const newTheme = isDarkNow ? 'light' : 'dark';
          
          if (!(e as any).__themeToggled) {
            (e as any).__themeToggled = true;
            applyTheme(newTheme, true);
          }
        }
      }
    };

    const handleSync = (e: any) => {
      setTheme(e.detail);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('theme-sync', handleSync);
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('theme-sync', handleSync);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  const applyTheme = (mode: 'light' | 'dark', save: boolean = true) => {
    setTheme(mode);
    if (save) {
      try {
        localStorage.setItem('theme', mode);
        localStorage.setItem('theme-user-set', 'true');
      } catch (e) {}
    }
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    // Update global for consistency
    if (typeof window !== 'undefined') {
      (window as any).__theme = mode;
    }
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
        onClick={() => applyTheme('light', true)}
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
        onClick={() => applyTheme('dark', true)}
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



