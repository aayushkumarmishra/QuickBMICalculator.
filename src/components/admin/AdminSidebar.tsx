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
  Moon,
  History,
  Activity
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
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  { name: 'Monitoring', href: '/admin/monitoring', icon: Activity },
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
          fixed top-0 left-0 bottom-0 bg-canvas z-[70] transition-all duration-500 ease-premium
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-24' : 'lg:w-72'}
        `}
      >
        {/* Right-edge shadow separator */}
        <div className="absolute inset-y-0 right-0 w-px bg-hairline z-10" />
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-ink/[0.02] to-transparent pointer-events-none z-20" />

        <div className={`flex flex-col h-full ${isCollapsed ? 'lg:items-center' : ''}`}>
          {/* Sidebar Header */}
          {isCollapsed ? (
            /* Collapsed: vertical stack — logo then expand button */
            <div className="flex flex-col items-center pt-6 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-ink flex items-center justify-center text-canvas shadow-premium-lg shrink-0">
                <span className="font-black text-xs">QB</span>
              </div>
              <button
                onClick={toggleCollapse}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-mute hover:text-ink hover:bg-canvas-soft transition-all mt-2"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <button 
                onClick={onClose}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-canvas-soft text-mute mt-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            /* Expanded: horizontal row — brand block left, buttons right */
            <div className="flex items-start justify-between px-6 pt-6 pb-2 mb-4">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-2xl bg-ink flex items-center justify-center text-canvas shadow-premium-lg shrink-0 mt-0.5">
                  <span className="font-black text-xs">QB</span>
                </div>
                <AnimatePresence>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col min-w-0"
                  >
                    <span className="font-black tracking-tighter text-ink leading-tight text-lg truncate">Admin</span>
                    <span className="text-[10px] font-mono font-black text-mute/70 uppercase tracking-widest truncate">QuickBMICalculator Platform</span>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={toggleCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-mute hover:text-ink hover:bg-canvas-soft transition-all"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
                <button 
                  onClick={onClose}
                  className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-canvas-soft text-mute"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto admin-sidebar-nav" style={{ scrollbarGutter: 'stable', scrollbarWidth: 'thin' }}>
            <div className={isCollapsed ? 'flex flex-col items-center gap-0.5 py-1' : 'space-y-1'}>
              {navItems.map((item) => {
                const isActive = normalizedPath === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`
                      flex items-center rounded-[1.25rem] transition-all duration-300 group relative
                      ${isActive 
                        ? 'bg-ink text-canvas shadow-premium-lg' 
                        : 'text-mute hover:text-ink hover:bg-canvas-soft'
                      }
                      ${isCollapsed 
                        ? 'justify-center w-12 h-12' 
                        : 'justify-between py-3.5 px-5 mx-3'
                      }
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
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className={`border-t border-hairline ${isCollapsed ? 'p-3 pt-4 w-full' : 'p-6'}`}>
            {/* Theme Toggle */}
            <div className={`bg-canvas-soft border border-hairline rounded-pill p-1 flex ${isCollapsed ? 'flex-col items-center gap-1' : ''} ${!isCollapsed && 'mb-4'}`}>
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
                w-full flex items-center rounded-pill transition-all group
                ${isCollapsed 
                  ? 'justify-center py-3 text-mute hover:text-red-500 hover:bg-red-500/5' 
                  : 'justify-between py-4 px-6 text-[10px] font-black uppercase tracking-[0.25em] text-mute hover:text-red-500 hover:bg-red-500/5'
                }
              `}
            >
              <span className="flex items-center gap-4 shrink-0">
                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
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

<style>{`
.admin-sidebar-nav::-webkit-scrollbar {
  width: 6px;
}
.admin-sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.admin-sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-hairline, hsl(0 0% 80%));
  border-radius: 999px;
  min-height: 40px;
}
.admin-sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: var(--color-mute, hsl(0 0% 60%));
}
.dark .admin-sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-hairline, hsl(0 0% 25%));
}
.dark .admin-sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: var(--color-mute, hsl(0 0% 45%));
}
`}</style>
