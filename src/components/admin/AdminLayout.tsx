import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Menu, User, Settings, LogOut, Bell, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

interface AdminProfile {
  full_name: string;
  role: string;
  email: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentPath }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    // Check initial state
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved === 'true') setIsCollapsed(true);

    const handleToggle = (e: any) => setIsCollapsed(e.detail);
    window.addEventListener('admin-sidebar-toggle', handleToggle);

    fetchAdmin();

    return () => window.removeEventListener('admin-sidebar-toggle', handleToggle);
  }, []);

  const fetchAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, email')
        .eq('id', session.user.id)
        .single();

      if (data) setAdmin(data);
    } catch (e) {}
  };

  const getPageTitle = () => {
    const path = currentPath.split('/').filter(Boolean).pop();
    if (!path || path === 'admin') return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className="min-h-screen bg-canvas-soft flex overflow-x-hidden text-ink">
      {/* Sidebar */}
      <AdminSidebar 
        currentPath={currentPath} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div 
        className={`
          flex-1 flex flex-col min-w-0 transition-all duration-500 ease-premium
          ${isCollapsed ? 'lg:pl-24' : 'lg:pl-72'}
        `}
      >
        {/* Desktop & Mobile Header */}
        <header className="h-20 lg:h-24 bg-canvas/80 backdrop-blur-md border-b border-hairline flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
          {/* Mobile Menu & Logo */}
          <div className="flex items-center gap-4 lg:hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 bg-canvas-soft border border-hairline rounded-xl text-ink"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center text-canvas">
                <span className="font-black text-[10px]">QB</span>
              </div>
              <span className="font-black text-xs uppercase tracking-tighter">Admin.</span>
            </div>
          </div>

          {/* Page Context (Desktop) */}
          <div className="hidden lg:flex items-center gap-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-mute/40">{getPageTitle()}</h2>
            <div className="w-px h-4 bg-hairline" />
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-mono font-black text-status-healthy uppercase tracking-widest bg-status-healthy/5 px-2 py-0.5 rounded-md border border-status-healthy/10">System Operational</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 lg:gap-6">
            <button className="hidden sm:flex p-3 text-mute hover:text-ink hover:bg-canvas-soft rounded-pill transition-all relative group">
              <Bell className="w-4 h-4" />
              <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-red-500 rounded-full border border-canvas group-hover:scale-125 transition-transform" />
            </button>

            <div className="w-px h-6 bg-hairline hidden sm:block" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-pill border border-hairline bg-canvas hover:border-ink/20 transition-all active:scale-95 group"
              >
                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-ink flex items-center justify-center text-canvas font-black text-[10px] lg:text-xs shadow-premium-sm group-hover:scale-105 transition-transform">
                  {admin?.full_name?.charAt(0) || admin?.email?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                </div>
                <div className="hidden lg:flex flex-col items-start leading-none gap-1">
                  <span className="text-[10px] font-black tracking-tight">{admin?.full_name || 'Administrator'}</span>
                  <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-widest opacity-40">{admin?.role || 'Root Access'}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-mute transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-14 w-56 bg-canvas border border-hairline rounded-[1.5rem] shadow-premium-2xl z-50 py-3 overflow-hidden"
                    >
                      <div className="px-5 py-3 border-b border-hairline mb-2">
                        <p className="text-[10px] font-black text-ink truncate">{admin?.email}</p>
                        <p className="text-[8px] font-mono font-bold text-mute uppercase tracking-widest mt-1">Platform Admin</p>
                      </div>
                      
                      <button 
                        onClick={() => { window.location.href = '/admin/settings'; setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-5 py-3 text-mute hover:text-ink hover:bg-canvas-soft transition-all"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                      </button>
                      
                      <button 
                        onClick={() => { window.location.href = '/logout'; setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-5 py-3 text-red-500 hover:bg-red-500/5 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-10 lg:p-12 xl:p-16 max-w-[1400px] w-full mx-auto relative">
          {/* Background Decorations */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(23,23,23,0.01)_0%,transparent_70%)] blur-[100px] rounded-full"></div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
