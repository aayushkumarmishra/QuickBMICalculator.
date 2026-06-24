import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { 
  Menu, 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  ChevronDown, 
  X, 
  UserPlus, 
  FileText, 
  ShieldAlert, 
  CheckCheck,
  ExternalLink
} from 'lucide-react';
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

interface Notification {
  id: string;
  type: 'user' | 'report' | 'system' | 'export';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentPath }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Check initial state
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved === 'true') setIsCollapsed(true);

    const handleToggle = (e: any) => setIsCollapsed(e.detail);
    window.addEventListener('admin-sidebar-toggle', handleToggle);

    fetchAdmin();
    fetchNotifications();

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

  const fetchNotifications = async () => {
    try {
      const [users, reports] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('health_reports').select('id, calculator_type, created_at').order('created_at', { ascending: false }).limit(3)
      ]);

      const readIds = JSON.parse(localStorage.getItem('admin-read-notifs') || '[]');

      const userNotifs: Notification[] = (users.data || []).map(u => ({
        id: `u-${u.id}`,
        type: 'user',
        title: 'New User Registered',
        message: `${u.full_name || u.email} joined the platform.`,
        time: u.created_at,
        read: readIds.includes(`u-${u.id}`),
        link: `/admin/users?select=${u.id}`
      }));

      const reportNotifs: Notification[] = (reports.data || []).map(r => ({
        id: `r-${r.id}`,
        type: 'report',
        title: 'New Health Report',
        message: `A new ${r.calculator_type.replace('_', ' ')} was generated.`,
        time: r.created_at,
        read: readIds.includes(`r-${r.id}`),
        link: '/admin/reports'
      }));

      // Add mock system event
      const systemNotifs: Notification[] = [{
        id: 'sys-1',
        type: 'system',
        title: 'Security Sync Complete',
        message: 'Platform registry was successfully synchronized.',
        time: new Date().toISOString(),
        read: readIds.includes('sys-1')
      }];

      const all = [...userNotifs, ...reportNotifs, ...systemNotifs]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setNotifications(all);
    } catch (e) {}
  };

  const markAsRead = (id: string) => {
    const readIds = JSON.parse(localStorage.getItem('admin-read-notifs') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('admin-read-notifs', JSON.stringify(readIds));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('admin-read-notifs', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('admin-read-notifs', JSON.stringify(allIds));
    setNotifications([]);
  };

  const getPageTitle = () => {
    const path = currentPath.split('/').filter(Boolean).pop();
    if (!path || path === 'admin') return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
              <span className="font-black text-xs uppercase tracking-tighter">Admin</span>
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
            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => { setShowNotifs(!showNotifs); setShowProfileMenu(false); }}
                className={`p-3 rounded-pill transition-all relative group ${showNotifs ? 'bg-ink text-canvas shadow-premium-lg' : 'text-mute hover:text-ink hover:bg-canvas-soft'}`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 text-[8px] font-black text-white rounded-full flex items-center justify-center border-2 border-canvas shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifs && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-14 w-80 sm:w-96 bg-canvas border border-hairline rounded-[2rem] shadow-premium-2xl z-50 overflow-hidden flex flex-col"
                    >
                      <div className="px-6 py-5 border-b border-hairline flex items-center justify-between bg-canvas-soft/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-widest text-ink">Notifications</span>
                          {unreadCount > 0 && (
                             <span className="px-2 py-0.5 rounded-md bg-ink text-canvas text-[8px] font-black">{unreadCount} NEW</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={markAllRead} className="p-1.5 hover:bg-canvas rounded-lg text-mute hover:text-ink transition-colors" title="Mark all as read">
                            <CheckCheck className="w-4 h-4" />
                          </button>
                          <button onClick={clearAll} className="p-1.5 hover:bg-canvas rounded-lg text-mute hover:text-red-500 transition-colors" title="Clear all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[400px] overflow-y-auto no-scrollbar py-2">
                        {notifications.length === 0 ? (
                          <div className="p-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center mx-auto opacity-20">
                               <Bell className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-mute opacity-40">No new alerts</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => { markAsRead(n.id); if (n.link) window.location.href = n.link; }}
                              className={`px-6 py-4 flex gap-4 hover:bg-canvas-soft transition-colors cursor-pointer relative group ${!n.read ? 'bg-blue-500/[0.02]' : ''}`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-hairline ${
                                n.type === 'user' ? 'bg-blue-500/5 text-blue-600' : 
                                n.type === 'report' ? 'bg-green-500/5 text-green-600' :
                                'bg-ink/5 text-ink'
                              }`}>
                                {n.type === 'user' ? <UserPlus className="w-4 h-4" /> : 
                                 n.type === 'report' ? <FileText className="w-4 h-4" /> : 
                                 <ShieldAlert className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <p className="text-[11px] font-black text-ink leading-tight truncate">{n.title}</p>
                                <p className="text-[10px] text-mute font-medium leading-normal line-clamp-2 opacity-60">{n.message}</p>
                                <p className="text-[8px] font-mono font-bold text-mute uppercase tracking-tighter opacity-40 pt-1">
                                  {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.time).toLocaleDateString()}
                                </p>
                              </div>
                              {!n.read && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              )}
                              {n.link && (
                                <ExternalLink className="absolute right-4 bottom-4 w-3 h-3 text-mute opacity-0 group-hover:opacity-20 transition-opacity" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {notifications.length > 0 && (
                        <div className="p-4 border-t border-hairline bg-canvas-soft/30">
                          <button 
                            onClick={clearAll}
                            className="w-full py-2.5 rounded-xl border border-hairline bg-canvas text-[9px] font-black uppercase tracking-widest text-mute hover:text-ink hover:border-ink transition-all"
                          >
                            Dismiss All Notifications
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-6 bg-hairline hidden sm:block" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifs(false); }}
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
