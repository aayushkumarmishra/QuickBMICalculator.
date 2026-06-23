import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Activity, 
  Database, 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  Server, 
  Globe, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  Loader2, 
  CalendarDays,
  User,
  History,
  TrendingUp,
  BarChart3,
  Mail,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DBHealthDetail {
  count: number;
  status: 'Healthy' | 'Error';
  error: string | null;
}

interface DBHealthState {
  profiles: DBHealthDetail;
  trackerProfiles: DBHealthDetail;
  healthReports: DBHealthDetail;
  auditLogs: DBHealthDetail;
}

interface Activity24hState {
  newRegistrations: number;
  newReports: number;
  newAuditEvents: number;
}

interface SystemLoadState {
  reportsPerUser: number;
  profilesPerUser: number;
  engagementRatio: number;
}

interface RecentEvent {
  id: string;
  created_at: string;
  email: string | null;
  action: string | null;
  status: string | null;
}

interface LastLoginInfo {
  time: string | null;
  email: string | null;
}

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

export const MonitoringDashboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // States
  const [dbHealth, setDbHealth] = useState<DBHealthState>({
    profiles: { count: 0, status: 'Healthy', error: null },
    trackerProfiles: { count: 0, status: 'Healthy', error: null },
    healthReports: { count: 0, status: 'Healthy', error: null },
    auditLogs: { count: 0, status: 'Healthy', error: null }
  });

  const [lastLogin, setLastLogin] = useState<LastLoginInfo>({ time: null, email: null });
  const [activity24h, setActivity24h] = useState<Activity24hState>({
    newRegistrations: 0,
    newReports: 0,
    newAuditEvents: 0
  });

  const [systemLoad, setSystemLoad] = useState<SystemLoadState>({
    reportsPerUser: 0,
    profilesPerUser: 0,
    engagementRatio: 0
  });

  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);

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
        await fetchMonitoringData();
      } catch (err) {
        setError('Authentication error. Please try logging in again.');
        setAuthLoading(false);
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 1. Perform count-only database queries
      const [profilesRes, trackerRes, reportsRes, auditRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('tracker_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('health_reports').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true })
      ]);

      const updatedDbHealth: DBHealthState = {
        profiles: { 
          count: profilesRes.count || 0, 
          status: profilesRes.error ? 'Error' : 'Healthy', 
          error: profilesRes.error ? profilesRes.error.message : null 
        },
        trackerProfiles: { 
          count: trackerRes.count || 0, 
          status: trackerRes.error ? 'Error' : 'Healthy', 
          error: trackerRes.error ? trackerRes.error.message : null 
        },
        healthReports: { 
          count: reportsRes.count || 0, 
          status: reportsRes.error ? 'Error' : 'Healthy', 
          error: reportsRes.error ? reportsRes.error.message : null 
        },
        auditLogs: { 
          count: auditRes.count || 0, 
          status: auditRes.error ? 'Error' : 'Healthy', 
          error: auditRes.error ? auditRes.error.message : null 
        }
      };
      setDbHealth(updatedDbHealth);

      // 2. Fetch last login activity
      const { data: lastLoginData } = await supabase
        .from('audit_logs')
        .select('created_at, email')
        .eq('action', 'User Login')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastLoginData && lastLoginData.length > 0) {
        setLastLogin({
          time: lastLoginData[0].created_at,
          email: lastLoginData[0].email
        });
      } else {
        setLastLogin({ time: null, email: null });
      }

      // 3. Fetch activity in last 24h
      const [newRegsRes, newReportsRes, newAuditRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('created_at', last24h),
        supabase.from('health_reports').select('*', { count: 'exact', head: true }).gt('created_at', last24h),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gt('created_at', last24h)
      ]);

      setActivity24h({
        newRegistrations: newRegsRes.count || 0,
        newReports: newReportsRes.count || 0,
        newAuditEvents: newAuditRes.count || 0
      });

      // 4. Calculate engagement and load ratios
      const totalUsers = profilesRes.count || 0;
      const totalReports = reportsRes.count || 0;
      const totalProfiles = trackerRes.count || 0;

      // Fetch unique users with reports count database-side to prevent unbounded client downloads.
      let uniqueUsersWithReports = 0;
      const { data: rpcCount, error: rpcError } = await supabase.rpc('get_unique_reports_user_count');
      if (!rpcError && rpcCount !== null) {
        uniqueUsersWithReports = Number(rpcCount);
      } else {
        console.error('Error fetching unique reports user count via RPC:', rpcError);
      }

      setSystemLoad({
        reportsPerUser: totalUsers > 0 ? (totalReports / totalUsers) : 0,
        profilesPerUser: totalUsers > 0 ? (totalProfiles / totalUsers) : 0,
        engagementRatio: totalUsers > 0 ? (uniqueUsersWithReports / totalUsers) : 0
      });

      // 5. Fetch last 10 audit logs entries
      const { data: recentEventsData } = await supabase
        .from('audit_logs')
        .select('id, created_at, email, action, status')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentEvents(recentEventsData as RecentEvent[] || []);
      setLastChecked(now);
    } catch (err: any) {
      console.error('Failed to load system metrics:', err);
      setError('An error occurred while loading system metrics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setToast({ message: 'Refreshing system metrics...', type: 'info' });
    await fetchMonitoringData();
    setToast({ message: 'System metrics synchronized', type: 'success' });
  };

  const handleExportCSV = () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const dbStatus = Object.values(dbHealth).every(d => d.status === 'Healthy') ? 'Healthy' : 'Warning';
      const authStatus = dbHealth.profiles.status === 'Healthy' ? 'Healthy' : 'Error';
      const auditStatus = dbHealth.auditLogs.status === 'Healthy' ? 'Healthy' : 'Error';
      const reportsStatus = dbHealth.healthReports.status === 'Healthy' ? 'Healthy' : 'Error';
      const trackerStatus = dbHealth.trackerProfiles.status === 'Healthy' ? 'Healthy' : 'Error';

      const csvRows = [
        ['System Monitoring Report'],
        ['Generated', new Date().toLocaleString()],
        [],
        ['PLATFORM HEALTH OVERVIEW'],
        ['Module', 'Status', 'Last Checked'],
        ['Database', dbStatus, lastChecked?.toLocaleString() || 'N/A'],
        ['Authentication', authStatus, lastChecked?.toLocaleString() || 'N/A'],
        ['Audit System', auditStatus, lastChecked?.toLocaleString() || 'N/A'],
        ['Reports Engine', reportsStatus, lastChecked?.toLocaleString() || 'N/A'],
        ['Tracker System', trackerStatus, lastChecked?.toLocaleString() || 'N/A'],
        [],
        ['DATABASE HEALTH DETAIL'],
        ['Table', 'Count', 'Status', 'Error'],
        ['profiles', dbHealth.profiles.count, dbHealth.profiles.status, dbHealth.profiles.error || ''],
        ['tracker_profiles', dbHealth.trackerProfiles.count, dbHealth.trackerProfiles.status, dbHealth.trackerProfiles.error || ''],
        ['health_reports', dbHealth.healthReports.count, dbHealth.healthReports.status, dbHealth.healthReports.error || ''],
        ['audit_logs', dbHealth.auditLogs.count, dbHealth.auditLogs.status, dbHealth.auditLogs.error || ''],
        [],
        ['AUTHENTICATION HEALTH'],
        ['Google Auth', 'Configured'],
        ['Email Auth', 'Configured'],
        ['Total Registered Accounts', dbHealth.profiles.count],
        ['Last Login Time', lastLogin.time ? new Date(lastLogin.time).toLocaleString() : 'N/A'],
        ['Last Login User', lastLogin.email || 'N/A'],
        [],
        ['ACTIVITY MONITOR (LAST 24 HOURS)'],
        ['Metric', 'Value'],
        ['New Registrations', activity24h.newRegistrations],
        ['New Reports Created', activity24h.newReports],
        ['New Audit Events', activity24h.newAuditEvents],
        [],
        ['SYSTEM LOAD SNAPSHOT'],
        ['Metric', 'Value'],
        ['Reports per User', systemLoad.reportsPerUser.toFixed(2)],
        ['Profiles per User', systemLoad.profilesPerUser.toFixed(2)],
        ['User Engagement Ratio', `${(systemLoad.engagementRatio * 100).toFixed(1)}%`],
        [],
        ['RECENT PLATFORM EVENTS (LAST 10)'],
        ['Timestamp', 'Email', 'Action', 'Status'],
        ...recentEvents.map(e => [
          e.created_at ? new Date(e.created_at).toLocaleString() : 'N/A',
          e.email || 'N/A',
          e.action || 'N/A',
          e.status || 'success'
        ])
      ];

      const csvContent = csvRows
        .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monitoring-report-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ message: 'Monitoring report downloaded', type: 'success' });
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      setToast({ message: 'Failed to generate report export', type: 'error' });
    }
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

  const dbStatus = Object.values(dbHealth).every(d => d.status === 'Healthy') ? 'Healthy' : 'Warning';
  const authStatus = dbHealth.profiles.status === 'Healthy' ? 'Healthy' : 'Error';
  const auditStatus = dbHealth.auditLogs.status === 'Healthy' ? 'Healthy' : 'Error';
  const reportsStatus = dbHealth.healthReports.status === 'Healthy' ? 'Healthy' : 'Error';
  const trackerStatus = dbHealth.trackerProfiles.status === 'Healthy' ? 'Healthy' : 'Error';

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-hairline">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">System Health</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-status-healthy/10 border border-status-healthy/20">
              <span className="w-1.5 h-1.5 rounded-full bg-status-healthy animate-pulse"></span>
              <span className="text-[9px] font-black text-status-healthy uppercase tracking-tighter">Monitoring Active</span>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-ink leading-[0.9]">
              System Monitoring
            </h1>
            <p className="text-sm text-mute font-medium max-w-xl opacity-60">Real-time health audits, service connections, and load snapshots.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleManualRefresh}
            disabled={loading}
            className="h-12 px-6 rounded-pill bg-canvas border border-hairline text-ink font-black text-[11px] uppercase tracking-widest hover:bg-canvas-soft transition-all shadow-premium-sm flex items-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-mute" />}
            Refresh Stats
          </button>

          <button 
            onClick={handleExportCSV}
            disabled={loading}
            className="h-12 px-6 rounded-pill bg-ink text-canvas font-black text-[11px] uppercase tracking-widest hover:shadow-premium-lg transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-canvas" />
            Export Monitoring Report
          </button>
        </div>
      </header>

      {error && (
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-600 shadow-premium-sm">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* SECTION 1 - Platform Health Overview */}
      <section className="space-y-4">
        <h3 className="text-xl font-black tracking-tight text-ink">Platform Health Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            { label: 'Database Status', status: dbStatus, icon: Database },
            { label: 'Authentication Status', status: authStatus, icon: Lock },
            { label: 'Audit System Status', status: auditStatus, icon: History },
            { label: 'Reports Engine Status', status: reportsStatus, icon: Cpu },
            { label: 'Tracker System Status', status: trackerStatus, icon: Server }
          ].map((card, i) => {
            const isHealthy = card.status === 'Healthy';
            const isWarning = card.status === 'Warning';
            return (
              <div key={i} className="bg-canvas border border-hairline p-6 rounded-[2rem] shadow-premium-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-canvas-soft border border-hairline">
                    <card.icon className="w-5 h-5 text-ink" />
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    isHealthy ? 'bg-status-healthy/10 text-status-healthy border border-status-healthy/20' : 
                    isWarning ? 'bg-status-over/10 text-status-over border border-status-over/20' :
                    'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isHealthy ? 'bg-status-healthy' : isWarning ? 'bg-status-over' : 'bg-red-500'
                    } animate-pulse`} />
                    {card.status}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest opacity-60 leading-none">{card.label}</p>
                  <p className="text-[9px] font-mono text-mute opacity-40 mt-2">
                    Checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Pending'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2 Column Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 2 - Database Health */}
        <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">Database Health</h3>
            <p className="text-xs text-mute opacity-60">Connected tables count analysis and direct queries status.</p>
          </div>
          
          <div className="py-6 space-y-4">
            {[
              { name: 'profiles', info: dbHealth.profiles },
              { name: 'tracker_profiles', info: dbHealth.trackerProfiles },
              { name: 'health_reports', info: dbHealth.healthReports },
              { name: 'audit_logs', info: dbHealth.auditLogs }
            ].map((table) => {
              const isErr = table.info.status === 'Error';
              return (
                <div key={table.name} className="flex items-center justify-between py-3 border-b border-hairline">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-mute opacity-40" />
                    <span className="text-xs font-mono font-bold text-ink">{table.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-ink">{table.info.count} rows</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                      isErr ? 'bg-red-500/5 text-red-600 border-red-500/10' : 'bg-status-healthy/5 text-status-healthy border-status-healthy/10'
                    }`}>
                      {table.info.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3 - Authentication Health */}
        <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">Authentication Health</h3>
            <p className="text-xs text-mute opacity-60">Security mechanisms status and user login stream diagnostics.</p>
          </div>

          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-hairline">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-ink">Google Authentication</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-pill text-[9px] font-black uppercase tracking-widest bg-status-healthy/10 text-status-healthy border border-status-healthy/20">
                Configured
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-hairline">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-ink" />
                <span className="text-xs font-bold text-ink">Email Authentication</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-pill text-[9px] font-black uppercase tracking-widest bg-status-healthy/10 text-status-healthy border border-status-healthy/20">
                Configured
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-hairline">
              <span className="text-xs text-mute font-medium">Total Registered Accounts</span>
              <span className="text-sm font-black text-ink">{dbHealth.profiles.count}</span>
            </div>

            <div className="py-2 space-y-1">
              <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Last Login Activity</p>
              {lastLogin.time ? (
                <div className="flex items-center justify-between text-xs text-ink font-bold pt-1">
                  <span className="truncate max-w-[200px]">{lastLogin.email}</span>
                  <span className="text-mute font-mono text-[10px] font-normal">{new Date(lastLogin.time).toLocaleString()}</span>
                </div>
              ) : (
                <p className="text-xs text-mute italic pt-1">No recent login records found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Monitor and System Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 4 - Activity Monitor */}
        <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">Activity Monitor (Last 24 Hours)</h3>
            <p className="text-xs text-mute opacity-60">Real-time usage velocities and system interactions.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="p-5 bg-canvas-soft border border-hairline rounded-2xl text-center space-y-1">
              <span className="text-[8px] font-mono font-black text-mute uppercase tracking-widest opacity-60">New Users</span>
              <p className="text-2xl font-black text-ink">{activity24h.newRegistrations}</p>
            </div>
            <div className="p-5 bg-canvas-soft border border-hairline rounded-2xl text-center space-y-1">
              <span className="text-[8px] font-mono font-black text-mute uppercase tracking-widest opacity-60">New Reports</span>
              <p className="text-2xl font-black text-ink">{activity24h.newReports}</p>
            </div>
            <div className="p-5 bg-canvas-soft border border-hairline rounded-2xl text-center space-y-1">
              <span className="text-[8px] font-mono font-black text-mute uppercase tracking-widest opacity-60">Audit Events</span>
              <p className="text-2xl font-black text-ink">{activity24h.newAuditEvents}</p>
            </div>
          </div>
        </div>

        {/* SECTION 5 - System Load Snapshot */}
        <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">System Load Snapshot</h3>
            <p className="text-xs text-mute opacity-60">Ratio metrics determining database workload coefficients.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-ink">
                <span>Reports per User</span>
                <span className="font-mono">{systemLoad.reportsPerUser.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-canvas border border-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-ink transition-all duration-1000"
                  style={{ width: `${Math.min(100, systemLoad.reportsPerUser * 10)}%` }} // normalized for UI visual
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-ink">
                <span>Profiles per User</span>
                <span className="font-mono">{systemLoad.profilesPerUser.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-canvas border border-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-ink transition-all duration-1000"
                  style={{ width: `${Math.min(100, systemLoad.profilesPerUser * 20)}%` }} // normalized for UI visual
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-ink">
                <span>User Engagement Ratio (Approx.)</span>
                <span className="font-mono">{(systemLoad.engagementRatio * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-canvas border border-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-status-healthy transition-all duration-1000"
                  style={{ width: `${systemLoad.engagementRatio * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 7 - System Alerts */}
      <section className="space-y-4">
        <h3 className="text-xl font-black tracking-tight text-ink">System Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Query Result Alert */}
          {Object.values(dbHealth).every(d => d.status === 'Healthy') ? (
            <div className="p-6 bg-status-healthy/5 border border-status-healthy/20 rounded-[2rem] flex items-center gap-4 text-status-healthy shadow-premium-sm">
              <div className="w-10 h-10 rounded-full bg-status-healthy/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">System Status Nominal</p>
                <p className="text-[10px] text-mute opacity-80 mt-0.5">No critical database module or connectivity issues detected.</p>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-status-over/5 border border-status-over/20 rounded-[2rem] flex items-center gap-4 text-status-over shadow-premium-sm">
              <div className="w-10 h-10 rounded-full bg-status-over/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">Warning: Core Infrastructure Anomalies</p>
                <p className="text-[10px] text-mute opacity-80 mt-0.5">
                  Some database query checks are failing: {[
                    dbHealth.profiles.status === 'Error' ? 'profiles' : '',
                    dbHealth.trackerProfiles.status === 'Error' ? 'tracker_profiles' : '',
                    dbHealth.healthReports.status === 'Error' ? 'health_reports' : '',
                    dbHealth.auditLogs.status === 'Error' ? 'audit_logs' : ''
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Hardcoded system status alerts */}
          <div className="p-6 bg-status-healthy/5 border border-status-healthy/20 rounded-[2rem] flex flex-col justify-center gap-2 text-status-healthy shadow-premium-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-status-healthy animate-pulse" />
              <span className="text-xs font-bold text-ink">Google Authentication Configured</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-status-healthy animate-pulse" />
              <span className="text-xs font-bold text-ink">Email Authentication Configured</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-status-healthy animate-pulse" />
              <span className="text-xs font-bold text-ink">Audit Logging Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 - Recent Platform Events */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-black tracking-tight text-ink">Recent Platform Events</h3>
          <span className="px-2.5 py-1 rounded-md bg-canvas-soft border border-hairline text-[9px] font-black text-mute uppercase tracking-widest">Registry Stream</span>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-sm relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-soft border-b border-hairline">
                  <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Actor</th>
                  <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Action</th>
                  <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-mute font-black uppercase tracking-widest text-[10px] opacity-40 italic">
                      No platform events recorded in the stream
                    </td>
                  </tr>
                ) : (
                  recentEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-canvas-soft/50 transition-colors">
                      <td className="py-5 px-8 text-xs font-mono font-bold text-mute opacity-70">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="py-5 px-8 font-black text-ink text-xs truncate max-w-[200px]">
                        {event.email || 'System'}
                      </td>
                      <td className="py-5 px-8">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-[9px] font-black uppercase tracking-widest border bg-ink/5 text-ink border-ink/10">
                          {event.action}
                        </span>
                      </td>
                      <td className="py-5 px-8">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          (event.status || 'success').toLowerCase() === 'success'
                            ? 'bg-status-healthy/5 text-status-healthy border-status-healthy/10'
                            : 'bg-red-500/5 text-red-600 border-red-500/10'
                        }`}>
                          {event.status || 'success'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
