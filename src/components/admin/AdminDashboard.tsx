import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminStats {
  totalUsers: number;
  totalReports: number;
  totalProfiles: number;
  googleUsers: number;
  emailUsers: number;
  usersTrend: number;
  reportsTrend: number;
  profilesTrend: number;
  googlePercent: number;
  emailPercent: number;
  avgReportsPerUser: string;
  adminCount?: number;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string;
  provider: string | null;
  created_at: string;
  profiles_count?: number;
  reports_count?: number;
}

interface RecentActivity {
  id: string;
  user_id: string | null;
  email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: any;
  trend?: string;
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
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${isPositive ? 'bg-status-healthy/10 text-status-healthy' : 'bg-red-500/10 text-red-500'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-ink tracking-tighter">
              {loading ? <span className="animate-pulse opacity-20">...</span> : value}
            </p>
          </div>
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
          <div className="w-2 h-2 rounded-full bg-blue-500" />
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
              className={`absolute bottom-0 inset-x-0 rounded-t-lg opacity-80 ${
                i % 4 === 0 ? 'bg-blue-500' :
                i % 4 === 1 ? 'bg-violet-500' :
                i % 4 === 2 ? 'bg-emerald-500' :
                'bg-amber-500'
              }`} 
            />
          </div>
          <span className="text-[8px] font-mono font-bold text-mute opacity-40 uppercase">M{i+1}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

type ChartTimeframe = '7d' | '30d' | '90d';

interface ChartDataPoint {
  label: string;
  dateLabel: string;
  count: number;
}

const bucketDatesByTimeframe = (rawDates: string[], timeframe: ChartTimeframe): ChartDataPoint[] => {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (timeframe === '7d') {
    const buckets: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = rawDates.filter(d => {
        const dt = new Date(d);
        return dt >= dayStart && dt < dayEnd;
      }).length;
      buckets.push({
        label: dayNames[dayStart.getDay()],
        dateLabel: dayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count
      });
    }
    return buckets;
  }

  const totalDays = timeframe === '30d' ? 30 : 90;
  const numWeeks = Math.ceil(totalDays / 7);
  const buckets: ChartDataPoint[] = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const count = rawDates.filter(d => {
      const dt = new Date(d);
      return dt >= weekStart && dt < weekEnd;
    }).length;
    buckets.push({
      label: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      dateLabel: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count
    });
  }
  return buckets;
};

const RealAnalyticsChart: React.FC<{
  title: string;
  rawDates: string[];
  unitLabel: string;
  timeframe: ChartTimeframe;
  onTimeframeChange: (t: ChartTimeframe) => void;
  delay?: number;
}> = ({ title, rawDates, unitLabel, timeframe, onTimeframeChange, delay = 0 }) => {
  const data = useMemo(() => bucketDatesByTimeframe(rawDates, timeframe), [rawDates, timeframe]);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg"
    >
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h4 className="text-sm font-black uppercase tracking-widest text-ink">{title}</h4>
        <div className="flex items-center bg-canvas-soft border border-hairline rounded-pill p-1">
          {(['7d', '30d', '90d'] as ChartTimeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 rounded-pill text-[9px] font-black uppercase tracking-widest transition-all ${
                timeframe === tf ? 'bg-ink text-canvas shadow-premium-sm' : 'text-mute hover:text-ink'
              }`}
            >
              {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48 flex items-end justify-between gap-2 relative">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="absolute inset-x-0 border-t border-hairline/50" style={{ bottom: `${i * 33}%` }} />
        ))}
        {data.map((point, i) => {
          const heightPercent = maxCount > 0 ? (point.count / maxCount) * 80 + (point.count > 0 ? 10 : 2) : 2;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 relative z-10 group">
              <div className="absolute -top-12 scale-0 group-hover:scale-100 transition-all duration-200 bg-ink text-canvas text-[9px] font-mono px-2.5 py-1.5 rounded-lg shadow-premium-lg z-20 pointer-events-none whitespace-nowrap text-center">
                <div className="font-bold">{point.dateLabel}</div>
                <div className="opacity-70">{point.count} {unitLabel}</div>
              </div>
              <div className="w-full bg-mute/5 rounded-t-lg h-32 relative overflow-hidden">
                <motion.div
                  key={`${timeframe}-${i}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ delay: delay + (i * 0.03), duration: 0.6 }}
                  className={`absolute bottom-0 inset-x-0 rounded-t-lg opacity-80 group-hover:opacity-100 transition-opacity ${
                    i % 4 === 0 ? 'bg-blue-500' :
                    i % 4 === 1 ? 'bg-violet-500' :
                    i % 4 === 2 ? 'bg-emerald-500' :
                    'bg-amber-500'
                  }`}
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-mute opacity-40 uppercase truncate max-w-[40px]">{point.label}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

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
  const [userGrowthTimeframe, setUserGrowthTimeframe] = useState<'7d' | '30d' | '90d'>('7d');
  const [userGrowthDates, setUserGrowthDates] = useState<string[]>([]);
  const [reportVolumeTimeframe, setReportVolumeTimeframe] = useState<'7d' | '30d' | '90d'>('7d');
  const [reportVolumeDates, setReportVolumeDates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const isAuthorized = profile?.role === 'admin';

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
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: dashboardData, error: rpcError } = await supabase.rpc('get_admin_dashboard_data', {
        seven_days: sevenDaysAgo,
        fourteen_days: fourteenDaysAgo,
        ninety_days: ninetyDaysAgo
      });
      if (rpcError) throw rpcError;

      const userCount = dashboardData.total_users;
      const reportCount = dashboardData.total_reports;
      const profileCount = dashboardData.total_profiles;
      const googleUsers = dashboardData.google_users;
      const emailUsers = userCount - googleUsers;
      const adminUserCount = dashboardData.admin_count;

      const usersCurrentWeek = dashboardData.users_current_week;
      const usersPreviousWeek = dashboardData.users_previous_week;
      const reportsCurrentWeek = dashboardData.reports_current_week;
      const reportsPreviousWeek = dashboardData.reports_previous_week;
      const profilesCurrentWeek = dashboardData.profiles_current_week;
      const profilesPreviousWeek = dashboardData.profiles_previous_week;

      const userGrowthData = dashboardData.user_growth_dates;
      const reportVolumeData = dashboardData.report_volume_dates;
      const recentUsersData = dashboardData.recent_users;

      const calcGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const usersTrend = calcGrowth(usersCurrentWeek || 0, usersPreviousWeek || 0);
      const reportsTrend = calcGrowth(reportsCurrentWeek || 0, reportsPreviousWeek || 0);
      const profilesTrend = calcGrowth(profilesCurrentWeek || 0, profilesPreviousWeek || 0);
      const googlePercent = userCount ? Math.round((googleUsers / userCount) * 100) : 0;
      const emailPercent = userCount ? Math.round((emailUsers / userCount) * 100) : 0;
      const avgReportsPerUser = userCount ? ((reportCount || 0) / userCount).toFixed(1) : '0.0';

      setStats({
        totalUsers: userCount || 0,
        totalReports: reportCount || 0,
        totalProfiles: profileCount || 0,
        googleUsers,
        emailUsers,
        usersTrend,
        reportsTrend,
        profilesTrend,
        googlePercent,
        emailPercent,
        avgReportsPerUser,
        adminCount: adminUserCount || 0
      });

      setUserGrowthDates(userGrowthData || []);
      setReportVolumeDates(reportVolumeData || []);
      setRecentUsers(recentUsersData || []);

      // Fetch recent audit logs safely
      try {
        const { data: recentActivitiesData, error: logErr } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (!logErr && recentActivitiesData) {
          setRecentActivities(recentActivitiesData as any);
        }
      } catch (logErr) {
        console.error('Failed to fetch recent audit logs:', logErr);
      }
      setLastSyncTime(new Date());
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
    setToast({ message: 'Reports export planned for Phase 5', type: 'info' });
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

  const dbStatus = error ? 'Degraded' : loading ? 'Syncing' : 'Healthy';
  const authStatus = error ? 'Offline' : loading ? 'Syncing' : 'Active';
  const storageStatus = error ? 'Offline' : loading ? 'Syncing' : 'Linked';
  const apiStatus = error ? 'Degraded' : loading ? 'Syncing' : 'Operational';
  const systemHealth = error ? '80%' : loading ? 'Syncing...' : '100%';

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
              Operations Hub
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
                      className="w-full flex items-center gap-3 px-5 py-3 text-mute/50 cursor-not-allowed hover:bg-transparent"
                      disabled
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Export (Phase 5)</span>
                    </button>

                    <button 
                      className="w-full flex items-center gap-3 px-5 py-3 text-mute hover:text-ink hover:bg-canvas-soft transition-all"
                      onClick={handleSystemRefresh}
                    >
                      <Server className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">System Refresh</span>
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
        <StatCard 
          label="Total Users" 
          value={stats?.totalUsers || 0} 
          icon={Users} 
          trend={stats ? `${stats.usersTrend >= 0 ? '+' : ''}${stats.usersTrend}%` : undefined} 
          isPositive={(stats?.usersTrend ?? 0) >= 0}
          delay={0.1} 
          loading={loading} 
          href="/admin/users" 
        />
        <StatCard 
          label="Reports" 
          value={stats?.totalReports || 0} 
          icon={FileText} 
          trend={stats ? `${stats.reportsTrend >= 0 ? '+' : ''}${stats.reportsTrend}%` : undefined} 
          isPositive={(stats?.reportsTrend ?? 0) >= 0}
          delay={0.2} 
          loading={loading} 
          href="/admin/reports" 
        />
        <StatCard 
          label="Profiles" 
          value={stats?.totalProfiles || 0} 
          icon={UserPlus} 
          trend={stats ? `${stats.profilesTrend >= 0 ? '+' : ''}${stats.profilesTrend}%` : undefined} 
          isPositive={(stats?.profilesTrend ?? 0) >= 0}
          delay={0.3} 
          loading={loading} 
          href="/admin/users" 
        />
        <StatCard 
          label="Google Users" 
          value={stats?.googleUsers || 0} 
          icon={Globe} 
          trend={stats ? `${stats.googlePercent}%` : undefined} 
          isPositive={true}
          delay={0.4} 
          loading={loading} 
          href="/admin/users?filter=google" 
        />
        <StatCard 
          label="Email Users" 
          value={stats?.emailUsers || 0} 
          icon={Mail} 
          trend={stats ? `${stats.emailPercent}%` : undefined} 
          isPositive={true}
          delay={0.5} 
          loading={loading} 
          href="/admin/users?filter=email" 
        />
        <StatCard 
          label="User Engagement" 
          value={stats?.avgReportsPerUser || '0.0'} 
          icon={Activity} 
          trend="Reports/User" 
          isPositive={true}
          delay={0.6} 
          loading={loading} 
        />
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RealAnalyticsChart 
          title="User Growth Analytics" 
          rawDates={userGrowthDates} 
          unitLabel="New Users"
          timeframe={userGrowthTimeframe}
          onTimeframeChange={setUserGrowthTimeframe}
          delay={0.7} 
        />
        <RealAnalyticsChart 
          title="Report Generation Volume" 
          rawDates={reportVolumeDates} 
          unitLabel="Reports Generated"
          timeframe={reportVolumeTimeframe}
          onTimeframeChange={setReportVolumeTimeframe}
          delay={0.8} 
        />
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  {(() => {
                    const filteredUsers = recentUsers.filter(user => 
                      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    return loading ? (
                      Array(8).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-6 px-8"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-canvas-soft"></div><div className="space-y-2"><div className="h-3 bg-canvas-soft rounded w-24"></div><div className="h-2 bg-canvas-soft rounded w-32 opacity-50"></div></div></div></td>
                          <td className="py-6 px-8"><div className="h-6 bg-canvas-soft rounded-full w-16"></div></td>
                          <td className="py-6 px-8"><div className="h-3 bg-canvas-soft rounded w-20"></div></td>
                          <td className="py-6 px-8"><div className="h-3 bg-canvas-soft rounded w-20"></div></td>
                          <td className="py-6 px-8 text-right"><div className="h-8 w-8 bg-canvas-soft rounded-full ml-auto"></div></td>
                        </tr>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-32 text-center text-mute font-black uppercase tracking-widest text-[10px] opacity-40 italic">
                          {searchQuery ? 'No matching users found' : 'Empty Platform Instance'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
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
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                              ) : <Mail className="w-2.5 h-2.5" />}
                              {user.provider || 'Email'}
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-ink leading-tight">{user.profiles_count ?? 0} Profiles</span>
                                <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-tighter opacity-40">Active</span>
                              </div>
                              <div className="w-px h-6 bg-hairline" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-ink leading-tight">{user.reports_count ?? 0} Reports</span>
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
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Widget */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black tracking-tight text-ink">Recent Platform Activity</h3>
                <span className="px-2.5 py-1 rounded-md bg-canvas-soft border border-hairline text-[9px] font-black text-mute uppercase tracking-widest">Live Stream</span>
              </div>
              <a 
                href="/admin/audit-logs" 
                className="text-xs font-mono font-black text-mute hover:text-ink uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                View Registry
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-sm relative">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-canvas-soft border-b border-hairline">
                      <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Timestamp</th>
                      <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Actor</th>
                      <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Action</th>
                      <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Description</th>
                      <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-5 px-8"><div className="h-3 bg-canvas-soft rounded w-20"></div></td>
                          <td className="py-5 px-8"><div className="h-3 bg-canvas-soft rounded w-24"></div></td>
                          <td className="py-5 px-8"><div className="h-5 bg-canvas-soft rounded-full w-16"></div></td>
                          <td className="py-5 px-8"><div className="h-3 bg-canvas-soft rounded w-48"></div></td>
                          <td className="py-5 px-8"><div className="h-5 bg-canvas-soft rounded w-12"></div></td>
                        </tr>
                      ))
                    ) : recentActivities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-mute font-black uppercase tracking-widest text-[10px] opacity-40 italic">No activity logs recorded yet</td>
                      </tr>
                    ) : (
                      recentActivities.map((act) => {
                        const getActionColor = (action: string) => {
                          const a = action.toLowerCase();
                          if (a.includes('login')) return 'bg-green-500/5 text-green-600 border-green-500/10';
                          if (a.includes('logout')) return 'bg-slate-500/5 text-slate-600 border-slate-500/10';
                          if (a.includes('registration')) return 'bg-blue-500/5 text-blue-600 border-blue-500/10';
                          if (a.includes('change') || a.includes('updated') || a.includes('settings')) return 'bg-amber-500/5 text-amber-600 border-amber-500/10';
                          if (a.includes('export')) return 'bg-purple-500/5 text-purple-600 border-purple-500/10';
                          return 'bg-ink/5 text-ink border-ink/10';
                        };
                        
                        return (
                          <tr 
                            key={act.id} 
                            onClick={() => window.location.href = '/admin/audit-logs'}
                            className="hover:bg-canvas-soft/50 transition-colors group cursor-pointer"
                          >
                            <td className="py-5 px-8 text-xs font-mono font-bold text-mute opacity-70">
                              {new Date(act.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-5 px-8 font-black text-ink text-xs truncate max-w-[120px]">
                              {act.profiles?.full_name || act.email || 'System'}
                            </td>
                            <td className="py-5 px-8">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[9px] font-black uppercase tracking-widest border ${getActionColor(act.action)}`}>
                                {act.action}
                              </span>
                            </td>
                            <td className="py-5 px-8 text-xs text-ink font-bold tracking-tight truncate max-w-[200px]">
                              {act.description}
                            </td>
                            <td className="py-5 px-8">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                (act.status || 'success').toLowerCase() === 'success'
                                  ? 'bg-status-healthy/5 text-status-healthy border-status-healthy/10'
                                  : 'bg-red-500/5 text-red-600 border-red-500/10'
                              }`}>
                                {act.status || 'Success'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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
                { label: 'Logs', icon: Activity, color: 'text-rose-500', href: '/admin/audit-logs' },
                { label: 'Settings', icon: Settings, color: 'text-slate-500', href: '/admin/settings' },
                { label: 'Export (Phase 5)', icon: Download, color: 'text-amber-500', href: '#' }
              ].map((action, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    if (action.label.includes('Phase 5') || action.href === '#') {
                      setToast({ message: 'Export feature planned for Phase 5', type: 'info' });
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
          <div className="bg-ink text-canvas p-8 rounded-[2.5rem] shadow-premium-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-status-healthy" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tighter">System Health</h3>
                  <p className="text-[9px] font-mono font-black text-status-healthy uppercase tracking-widest">Active & Protected</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Database Status', icon: Database, status: dbStatus },
                  { label: 'Authentication', icon: Lock, status: authStatus },
                  { label: 'Storage', icon: Server, status: storageStatus },
                  { label: 'API Status', icon: Globe, status: apiStatus }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group/item cursor-default">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-3.5 h-3.5 opacity-40 group-hover/item:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-bold text-canvas/60 group-hover/item:text-canvas transition-colors">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1 h-1 rounded-full ${
                        item.status === 'Healthy' || item.status === 'Active' || item.status === 'Linked' || item.status === 'Operational'
                          ? 'bg-status-healthy shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                          : item.status === 'Syncing'
                          ? 'bg-blue-400 animate-pulse'
                          : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                      }`} />
                      <span className="text-[9px] font-mono font-black uppercase tracking-tighter">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-status-healthy opacity-80" />
                    <span className="text-[10px] font-bold text-canvas/60">System Health</span>
                  </div>
                  <span className="text-xs font-mono font-black text-status-healthy">{systemHealth}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 opacity-40" />
                    <span className="text-[10px] font-bold text-canvas/60">Total Admin Users</span>
                  </div>
                  <span className="text-xs font-mono font-black">{stats?.adminCount !== undefined ? stats.adminCount : '1'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 opacity-40" />
                    <span className="text-[10px] font-bold text-canvas/60">Last Sync Time</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-canvas/80">
                    {lastSyncTime ? lastSyncTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 opacity-40" />
                    <span className="text-[10px] font-bold text-canvas/60">Last Audit Event</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-canvas/80 truncate max-w-xs pl-5 opacity-90">
                    {recentActivities[0] ? (
                      <span className="bg-white/10 px-2 py-0.5 rounded text-[8px] tracking-wide uppercase">
                        {recentActivities[0].action}
                      </span>
                    ) : (
                      'No events'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
