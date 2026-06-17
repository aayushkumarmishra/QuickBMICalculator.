import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  ChevronRight,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: FileText },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings }
];

export const AdminSidebar: React.FC<SidebarProps> = ({ currentPath, isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // Load collapse state
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved === 'true') setIsCollapsed(true);

    // Load theme state
    const getInitialTheme = () => {
      try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      } catch (e) {}
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    };
    setTheme(getInitialTheme());

    const handleThemeSync = (e: any) => setTheme(e.detail);
    window.addEventListener('theme-sync', handleThemeSync);
    return () => window.removeEventListener('theme-sync', handleThemeSync);
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', newState.toString());
    // Dispatch event for layout sync
    window.dispatchEvent(new CustomEvent('admin-sidebar-toggle', { detail: newState }));
  };

  const applyTheme = (mode: 'light' | 'dark') => {
    setTheme(mode);
    try {
      localStorage.setItem('theme', mode);
      localStorage.setItem('theme-user-set', 'true');
    } catch (e) {}
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    window.dispatchEvent(new CustomEvent('theme-sync', { detail: mode }));
  };

  const basePath = currentPath.split('?')[0];
  const normalizedPath = basePath.endsWith('/') && basePath !== '/' 
    ? basePath.slice(0, -1) 
    : basePath;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed top-0 left-0 bottom-0 bg-canvas border-r border-hairline z-[70] transition-all duration-500 ease-premium
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-24' : 'lg:w-72'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className={`flex items-center justify-between p-8 mb-4 ${isCollapsed ? 'lg:p-6 lg:justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-ink flex items-center justify-center text-canvas shadow-premium-lg shrink-0">
                <span className="font-black text-xs">QB</span>
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col whitespace-nowrap"
                  >
                    <span className="font-black tracking-tighter text-ink leading-tight text-lg">Admin.</span>
                    <span className="text-[10px] font-mono font-black text-mute uppercase tracking-widest opacity-40">QuickBMI Platform</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-canvas-soft rounded-xl lg:hidden"
            >
              <X className="w-5 h-5 text-mute" />
            </button>

            {!isCollapsed && (
              <button 
                onClick={toggleCollapse}
                className="hidden lg:flex p-2 hover:bg-canvas-soft rounded-xl text-mute hover:text-ink transition-colors"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div className="hidden lg:flex justify-center mb-8">
              <button 
                onClick={toggleCollapse}
                className="p-2 hover:bg-canvas-soft rounded-xl text-mute hover:text-ink transition-colors"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = normalizedPath === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`
                    flex items-center justify-between px-4 py-3.5 rounded-[1.25rem] transition-all duration-300 group relative
                    ${isActive 
                      ? 'bg-ink text-canvas shadow-premium-lg' 
                      : 'text-mute hover:text-ink hover:bg-canvas-soft'
                    }
                    ${isCollapsed ? 'lg:justify-center lg:px-0 lg:w-12 lg:mx-auto' : 'px-6'}
                  `}
                >
                  <div className="flex items-center gap-4 relative z-10 shrink-0">
                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-canvas' : 'text-mute group-hover:text-ink'}`} />
                    {!isCollapsed && (
                      <span className="text-[11px] font-black uppercase tracking-[0.15em] whitespace-nowrap">{item.name}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight className={`w-4 h-4 transition-all duration-300 ${isActive ? 'opacity-40 translate-x-1' : 'opacity-0 -translate-x-2 group-hover:opacity-20 group-hover:translate-x-0'}`} />
                  )}
                  
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.25rem]" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className={`p-4 mt-auto border-t border-hairline ${isCollapsed ? 'lg:p-2' : 'lg:p-6'}`}>
            {/* Theme Toggle - Side-by-Side styled for Sidebar */}
            <div className={`bg-canvas-soft border border-hairline rounded-pill p-1 flex mb-4 ${isCollapsed ? 'flex-col items-center gap-1' : ''}`}>
              <button 
                onClick={() => applyTheme('light')}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-pill transition-all ${theme === 'light' ? 'bg-canvas text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
                {!isCollapsed && <span className="ml-2 text-[9px] font-black uppercase tracking-widest">Light</span>}
              </button>
              <button 
                onClick={() => applyTheme('dark')}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-pill transition-all ${theme === 'dark' ? 'bg-canvas text-ink shadow-premium-sm' : 'text-mute hover:text-ink'}`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
                {!isCollapsed && <span className="ml-2 text-[9px] font-black uppercase tracking-widest">Dark</span>}
              </button>
            </div>

            <button 
              onClick={() => window.location.href = '/logout'}
              className={`
                w-full flex items-center justify-between py-4 text-[10px] font-black uppercase tracking-[0.25em] text-mute hover:text-red-500 hover:bg-red-500/5 rounded-pill transition-all group
                ${isCollapsed ? 'lg:justify-center lg:px-0' : 'px-6'}
              `}
            >
              <span className="flex items-center gap-4 shrink-0">
                <LogOut className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${isCollapsed ? '' : ''}`} />
                {!isCollapsed && "Logout"}
              </span>
              {!isCollapsed && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
