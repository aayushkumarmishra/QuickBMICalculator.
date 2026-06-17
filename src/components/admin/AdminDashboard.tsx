import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  UserPlus, 
  TrendingUp,
  Mail,
  ArrowUpRight,
  LayoutDashboard,
  Server,
  Database,
  Lock,
  Globe,
  Settings,
  Download,
  Activity,
  UserCheck,
  Search,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminStats {
  totalUsers: number;
  totalReports: number;
  totalProfiles: number;
  googleUsers: number;
  emailUsers: number;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string;
  provider: string | null;
  created_at: string;
}

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: any;
  trend: string;
  isPositive?: boolean;
  loading?: boolean;
  delay?: number;
  href?: string;
}> = ({ label, value, icon: Icon, trend, isPositive = true, loading, delay = 0, href }) => {
  const CardWrapper = href ? 'a' : 'div';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full"
    >
      <CardWrapper
        href={href}
        className={`
          block h-full bg-canvas border border-hairline p-6 rounded-[2rem] shadow-premium-sm transition-all group relative overflow-hidden
          ${href ? 'hover:shadow-premium-xl hover:-translate-y-1 cursor-pointer active:scale-[0.98]' : 'cursor-default'}
        `}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-ink/[0.02] to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-2xl bg-canvas-soft border border-hairline group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-5 h-5 text-ink" />
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${isPositive ? 'bg-status-healthy/10 text-status-healthy' : 'bg-red-500/10 text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-ink tracking-tighter">
              {loading ? <span className="animate-pulse opacity-20">...</span> : value}
            </p>
          </div>
        </div>
        {/* Simple Sparkline Placeholder */}
        <div className="mt-4 h-8 flex items-end gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
          {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
            <div key={i} className="flex-1 bg-ink rounded-t-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
      </CardWrapper>
    </motion.div>
  );
};

const AnalyticsPlaceholder: React.FC<{ title: string; delay?: number }> = ({ title, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg"
  >
    <div className="flex items-center justify-between mb-8">
      <h4 className="text-sm font-black uppercase tracking-widest text-ink">{title}</h4>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-canvas-soft border border-hairline">
          <div className="w-2 h-2 rounded-full bg-ink" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Current</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-canvas-soft border border-hairline">
          <div className="w-2 h-2 rounded-full bg-mute opacity-30" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Previous</span>
        </div>
      </div>
    </div>
    <div className="h-48 flex items-end justify-between gap-2 relative">
      {/* Grid Lines */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="absolute inset-x-0 border-t border-hairline/50" style={{ bottom: `${i * 33}%` }} />
      ))}
      {/* Bars/Data Placeholder */}
      {Array(12).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 relative z-10">
          <div className="w-full bg-mute/5 rounded-t-lg h-32 relative overflow-hidden">
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: `${Math.random() * 80 + 20}%` }}
              transition={{ delay: delay + (i * 0.05), duration: 1 }}
              className="absolute bottom-0 inset-x-0 bg-ink rounded-t-lg opacity-80" 
            />
          </div>
          <span className="text-[8px] font-mono font-bold text-mute opacity-40 uppercase">M{i+1}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

const Toast: React.FC<{ 
  message: string; 
  type: 'success' | 'error' | 'info'; 
  onClose: () => void 
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed bottom-10 right-10 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-premium-2xl border ${
        type === 'success' ? 'bg-status-healthy/10 border-status-healthy/20 text-status-healthy' : 
        type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
        'bg-blue-500/10 border-blue-500/20 text-blue-600'
      }`}
    >
      {type === 'success' ? <ShieldCheck className="w-5 h-5" /> : 
       type === 'error' ? <ShieldAlert className="w-5 h-5" /> :
       <Activity className="w-5 h-5" />}
      <span className="text-[11px] font-black uppercase tracking-widest">{message}</span>
    </motion.div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        const ADMIN_EMAIL = import.meta.env.PUBLIC_ADMIN_EMAIL;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', session.user.id)
          .single();

        const isAuthorized = 
          session.user.email === ADMIN_EMAIL && 
          profile?.email === ADMIN_EMAIL && 
          profile?.role === 'admin';

        if (profileError || !isAuthorized) {
          window.location.href = '/403';
          return;
        }

        setIsAdmin(true);
        setAuthLoading(false);
        await fetchData();
      } catch (err) {
        setError('Authentication error. Please try logging in again.');
        setAuthLoading(false);
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { count: userCount },
        { count: reportCount },
        { count: profileCount },
        { data: providerData },
        { data: recentUsersData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('health_reports').select('*', { count: 'exact', head: true }),
        supabase.from('tracker_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('provider'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(8)
      ]);

      const googleUsers = providerData?.filter(p => p.provider === 'google').length || 0;
      const emailUsers = (userCount || 0) - googleUsers;

      setStats({
        totalUsers: userCount || 0,
        totalReports: reportCount || 0,
        totalProfiles: profileCount || 0,
        googleUsers,
        emailUsers
      });

      setRecentUsers(recentUsersData as RecentUser[] || []);
    } catch (err) {
      setError('Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemRefresh = async () => {
    setToast({ message: 'Refreshing system data...', type: 'info' });
    await fetchData();
    setToast({ message: 'System data synchronized', type: 'success' });
    setIsActionsOpen(false);
  };

  const handleExportReports = () => {
    setToast({ message: 'Preparing export package...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Export feature coming soon', type: 'error' });
    }, 1500);
    setIsActionsOpen(false);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-ink opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />
        </div>
        <p className="mt-6 text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em] animate-pulse">Establishing Secure Session</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Premium Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-hairline">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">Platform Core</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-status-healthy/10 border border-status-healthy/20">
              <span className="w-1.5 h-1.5 rounded-full bg-status-healthy animate-pulse"></span>
              <span className="text-[9px] font-black text-status-healthy uppercase tracking-tighter">System Live</span>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-ink leading-[0.9]">
              Operations Hub.
            </h1>
            <p className="text-sm text-mute font-medium max-w-xl opacity-60">Real-time platform metrics and administrative controls.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="h-12 px-6 rounded-pill bg-canvas border border-hairline text-ink font-black text-[11px] uppercase tracking-widest hover:bg-canvas-soft transition-all shadow-premium-sm flex items-center gap-3 group active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 transition-transform group-hover:rotate-180" />}
            Refresh
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              className={`h-12 w-12 rounded-full flex items-center justify-center shadow-premium-lg transition-all active:scale-90 group ${isActionsOpen ? 'bg-canvas border border-ink text-ink' : 'bg-ink text-canvas hover:scale-110'}`}
            >
              <Plus className={`w-5 h-5 transition-transform duration-500 ${isActionsOpen ? 'rotate-45' : ''}`} />
            </button>

            <AnimatePresence>
              {isActionsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsActionsOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-16 w-56 bg-canvas border border-hairline rounded-[1.5rem] shadow-premium-2xl z-50 py-3 overflow-hidden"
                  >
                    <div className="px-5 py-2 mb-2">
                       <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest opacity-40">Quick Actions</span>
                    </div>
                    
                    <button 
                      className="w-full flex items-center gap-3 px-5 py-3 text-mute hover:text-ink hover:bg-canvas-soft transition-all"
                      onClick={() => { window.location.href = '/admin/users'; setIsActionsOpen(false); }}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Add User</span>
                    </button>

                    <button 
                      className="w-full flex items-center gap-3 px-5 py-3 text-mute hover:text-ink hover:bg-canvas-soft transition-all"
                      onClick={handleExportReports}
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Export Reports</span>
                    </button>

                    <button 
                      className="w-full flex items-center gap-3 px-5 py-3 text-mute hover:text-ink hover:bg-canvas-soft transition-all"
                      onClick={handleSystemRefresh}
                    >
                      <Server className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">System Refresh</span>
                    </button>

                    <button 
                      className="w-full flex items-center gap-3 px-5 py-3 text-mute hover:text-ink hover:bg-canvas-soft transition-all"
                      onClick={() => {
                        setToast({ message: 'Security audit in progress...', type: 'info' });
                        setTimeout(() => setToast({ message: 'Session keys rotated', type: 'success' }), 2000);
                        setIsActionsOpen(false);
                      }}
                    >
                      <Lock className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Security Audit</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {error && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-600 shadow-premium-sm"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="font-bold text-sm tracking-tight">{error}</p>
        </motion.div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} trend="+12.5%" delay={0.1} loading={loading} href="/admin/users" />
        <StatCard label="Reports" value={stats?.totalReports || 0} icon={FileText} trend="+8.2%" delay={0.2} loading={loading} href="/admin/reports" />
        <StatCard label="Profiles" value={stats?.totalProfiles || 0} icon={UserPlus} trend="+4.1%" delay={0.3} loading={loading} href="/admin/users" />
        <StatCard label="Google Users" value={stats?.googleUsers || 0} icon={Globe} trend="64%" delay={0.4} loading={loading} href="/admin/users?filter=google" />
        <StatCard label="Email Users" value={stats?.emailUsers || 0} icon={Mail} trend="36%" delay={0.5} loading={loading} href="/admin/users?filter=email" />
        <StatCard label="Growth" value="Premium" icon={TrendingUp} trend="Active" delay={0.6} loading={loading} />
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnalyticsPlaceholder title="User Growth Analytics" delay={0.7} />
        <AnalyticsPlaceholder title="Report Generation Volume" delay={0.8} />
      </div>

      {/* Bottom Grid: 2:1 Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Recent Users Table Redesign */}
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <h3 className="text-2xl font-black tracking-tight text-ink">Recent Registrations</h3>
              <span className="px-2.5 py-1 rounded-md bg-canvas-soft border border-hairline text-[9px] font-black text-mute uppercase tracking-widest">New</span>
            </div>
            <div className="relative group max-w-xs hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute opacity-40 group-focus-within:opacity-100 transition-opacity" />
              <input 
                type="text" 
                placeholder="Search users..." 
                className="h-10 pl-9 pr-4 bg-canvas border border-hairline rounded-pill text-[11px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all w-48 focus:w-64"
              />
            </div>
          </div>
          
          <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-sm relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas-soft border-b border-hairline">
                    <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Platform User</th>
                    <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Provider</th>
                    <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Usage</th>
                    <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Registration</th>
                    <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em] text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {loading ? (
                    Array(8).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-6 px-8"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-canvas-soft"></div><div className="space-y-2"><div className="h-3 bg-canvas-soft rounded w-24"></div><div className="h-2 bg-canvas-soft rounded w-32 opacity-50"></div></div></div></td>
                        <td className="py-6 px-8"><div className="h-6 bg-canvas-soft rounded-full w-16"></div></td>
                        <td className="py-6 px-8"><div className="h-3 bg-canvas-soft rounded w-20"></div></td>
                        <td className="py-6 px-8"><div className="h-3 bg-canvas-soft rounded w-20"></div></td>
                        <td className="py-6 px-8 text-right"><div className="h-8 w-8 bg-canvas-soft rounded-full ml-auto"></div></td>
                      </tr>
                    ))
                  ) : recentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-32 text-center text-mute font-black uppercase tracking-widest text-[10px] opacity-40 italic">Empty Platform Instance</td>
                    </tr>
                  ) : (
                    recentUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        onClick={() => window.location.href = `/admin/users?select=${user.id}`}
                        className="hover:bg-canvas-soft/50 transition-colors group cursor-pointer"
                      >
                        <td className="py-6 px-8">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-2xl bg-canvas-soft border border-hairline flex items-center justify-center font-black text-[13px] text-ink shadow-premium-sm group-hover:scale-105 transition-transform">
                                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-status-healthy border-2 border-canvas shadow-sm" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-black text-ink text-sm tracking-tight group-hover:text-blue-600 transition-colors">{user.full_name || 'Anonymous User'}</p>
                              <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest opacity-60 leading-none">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-[9px] font-black uppercase tracking-widest border transition-colors ${
                            user.provider === 'google' 
                              ? 'bg-blue-500/5 text-blue-600 border-blue-500/10' 
                              : 'bg-ink/5 text-ink border-ink/10'
                          }`}>
                            {user.provider === 'google' ? (
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            ) : <Mail className="w-2.5 h-2.5" />}
                            {user.provider || 'Email'}
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-ink leading-tight">Profiles</span>
                              <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-tighter opacity-40">Active</span>
                            </div>
                            <div className="w-px h-6 bg-hairline" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-ink leading-tight">Reports</span>
                              <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-tighter opacity-40">Saved</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 px-8 text-xs font-mono font-bold text-mute opacity-60">
                          {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-6 px-8 text-right">
                          <div className="h-9 w-9 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mute group-hover:text-ink group-hover:border-ink group-hover:bg-canvas-soft transition-all active:scale-90 group-hover:rotate-45">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Actions & Health */}
        <div className="space-y-10">
          {/* Quick Actions Grid */}
          <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-sm">
            <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em] mb-8">Management Suite</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Users', icon: Users, color: 'text-blue-500', href: '/admin/users' },
                { label: 'Reports', icon: FileText, color: 'text-green-500', href: '/admin/reports' },
                { label: 'Analytics', icon: BarChart3, color: 'text-purple-500', href: '/admin/analytics' },
                { label: 'Logs', icon: Activity, color: 'text-rose-500', href: '#' },
                { label: 'Settings', icon: Settings, color: 'text-slate-500', href: '/admin/settings' },
                { label: 'Export', icon: Download, color: 'text-amber-500', href: '#' }
              ].map((action, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    if (action.href === '#') {
                      setToast({ message: `${action.label} feature coming soon`, type: 'info' });
                    } else {
                      window.location.href = action.href;
                    }
                  }}
                  className="flex flex-col items-center justify-center p-6 bg-canvas-soft border border-hairline rounded-[1.5rem] hover:bg-ink hover:text-canvas transition-all duration-300 group shadow-sm hover:shadow-premium-lg active:scale-95"
                >
                  <action.icon className={`w-5 h-5 mb-3 transition-colors ${action.color} group-hover:text-canvas`} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* System Health Card */}
          <div className="bg-ink text-canvas p-10 rounded-[2.5rem] shadow-premium-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-status-healthy" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tighter">System Health.</h3>
                  <p className="text-[9px] font-mono font-black text-status-healthy uppercase tracking-widest">Active & Protected</p>
                </div>
              </div>

              <div className="space-y-5">
                {[
                  { label: 'Database Status', icon: Database, status: 'Healthy' },
                  { label: 'Auth Infrastructure', icon: Lock, status: 'Active' },
                  { label: 'Storage Cluster', icon: Server, status: 'Linked' },
                  { label: 'API Endpoints', icon: Globe, status: 'Operational' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group/item cursor-default">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-3.5 h-3.5 opacity-40 group-hover/item:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-bold text-canvas/60 group-hover/item:text-canvas transition-colors">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-status-healthy shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                      <span className="text-[9px] font-mono font-black uppercase tracking-tighter">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] font-mono opacity-40">
                  <span className="uppercase tracking-widest">Last Audit Log</span>
                  <span className="font-black">12m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
