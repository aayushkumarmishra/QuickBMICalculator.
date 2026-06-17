import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Search, 
  ArrowUpRight, 
  Mail, 
  Globe, 
  FileText, 
  Trash2, 
  Loader2,
  ShieldCheck,
  X,
  Activity,
  AlertTriangle,
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  id: string;
  email: string;
  full_name: string;
  provider: string | null;
  created_at: string;
  profiles_count?: number;
  reports_count?: number;
  last_activity?: string;
}

interface UserProfile {
  id: string;
  nickname: string;
  profile_name: string;
  created_at: string;
}

interface UserReport {
  id: string;
  calculator_type: string;
  created_at: string;
}

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-ink/60 backdrop-blur-md"
          onClick={onCancel}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-canvas rounded-[2.5rem] p-10 shadow-premium-2xl border border-hairline overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-8">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h3 className="text-2xl font-black tracking-tighter text-ink mb-4">{title}</h3>
          <p className="text-sm text-mute font-medium leading-relaxed mb-10">{message}</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 h-14 bg-red-500 text-white rounded-pill font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-premium-md flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Confirm Delete
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 h-14 bg-canvas border border-hairline text-ink rounded-pill font-black text-[11px] uppercase tracking-widest hover:bg-canvas-soft transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const UserDetailsDrawer: React.FC<{
  user: User | null;
  onClose: () => void;
  onDeleteProfile: (id: string) => void;
  onDeleteReport: (id: string) => void;
}> = ({ user, onClose, onDeleteProfile, onDeleteReport }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserDetails(user.id);
    }
  }, [user]);

  const fetchUserDetails = async (userId: string) => {
    setLoading(true);
    try {
      const [profilesRes, reportsRes] = await Promise.all([
        supabase.from('tracker_profiles').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('health_reports').select('id, calculator_type, created_at').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      setProfiles(profilesRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex justify-end"
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-canvas h-full shadow-premium-2xl overflow-y-auto"
      >
        <div className="p-10 space-y-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-canvas-soft border border-hairline flex items-center justify-center font-black text-2xl text-ink shadow-premium-md">
                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tighter text-ink">{user.full_name || 'Anonymous User'}</h3>
                <p className="text-xs font-mono font-bold text-mute uppercase tracking-widest opacity-60">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-canvas-soft rounded-2xl transition-colors">
              <X className="w-6 h-6 text-mute" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-6 bg-canvas-soft border border-hairline rounded-[2rem] space-y-1">
              <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest opacity-40">Profiles</span>
              <p className="text-2xl font-black text-ink">{profiles.length}</p>
            </div>
            <div className="p-6 bg-canvas-soft border border-hairline rounded-[2rem] space-y-1">
              <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest opacity-40">Reports</span>
              <p className="text-2xl font-black text-ink">{reports.length}</p>
            </div>
            <div className="p-6 bg-canvas-soft border border-hairline rounded-[2rem] space-y-1">
              <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest opacity-40">Joined</span>
              <p className="text-lg font-black text-ink">{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* User Info Grid */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Account Metadata</h4>
            <div className="grid grid-cols-2 gap-8 p-8 bg-canvas border border-hairline rounded-[2.5rem] shadow-premium-sm">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-mute opacity-40 uppercase">Provider</span>
                <div className="flex items-center gap-2">
                  {user.provider === 'google' ? <Globe className="w-3.5 h-3.5 text-blue-500" /> : <Mail className="w-3.5 h-3.5 text-ink" />}
                  <span className="text-sm font-black text-ink uppercase tracking-tight">{user.provider || 'Email'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-mute opacity-40 uppercase">Registration ID</span>
                <p className="text-[10px] font-mono font-bold text-ink truncate">{user.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-mute opacity-40 uppercase">Latest Report</span>
                <p className="text-sm font-black text-ink tracking-tight">
                  {reports.length > 0 ? new Date(reports[0].created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-mute opacity-40 uppercase">Status</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-healthy" />
                  <span className="text-[10px] font-mono font-black text-status-healthy uppercase">Verified Account</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profiles Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Managed Profiles</h4>
              <span className="px-2 py-0.5 rounded-md bg-canvas-soft border border-hairline text-[9px] font-black text-mute">{profiles.length}</span>
            </div>
            <div className="space-y-3">
              {profiles.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-hairline rounded-[2rem] text-center italic text-mute text-xs opacity-40">No profiles created yet.</div>
              ) : (
                profiles.map((profile) => (
                  <div key={profile.id} className="group flex items-center justify-between p-5 bg-canvas border border-hairline rounded-[1.5rem] hover:shadow-premium-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-canvas-soft flex items-center justify-center text-xs font-black text-ink uppercase">
                        {(profile.nickname || profile.profile_name || 'P').charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-ink tracking-tight">{profile.nickname || profile.profile_name}</span>
                        <span className="text-[9px] font-mono font-bold text-mute opacity-40 uppercase tracking-widest">Created {new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteProfile(profile.id)}
                      className="p-2 text-mute hover:text-red-500 hover:bg-red-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reports Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Health Reports</h4>
              <span className="px-2 py-0.5 rounded-md bg-canvas-soft border border-hairline text-[9px] font-black text-mute">{reports.length}</span>
            </div>
            <div className="space-y-3 pb-12">
              {reports.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-hairline rounded-[2rem] text-center italic text-mute text-xs opacity-40">No reports generated yet.</div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="group flex items-center justify-between p-5 bg-canvas border border-hairline rounded-[1.5rem] hover:shadow-premium-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-canvas-soft flex items-center justify-center"><FileText className="w-4 h-4 text-ink" /></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-ink tracking-tight capitalize">{report.calculator_type.replace('_', ' ')} Report</span>
                        <span className="text-[9px] font-mono font-bold text-mute opacity-40 uppercase tracking-widest">Generated {new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteReport(report.id)}
                      className="p-2 text-mute hover:text-red-500 hover:bg-red-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'google' | 'email'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'profile' | 'report' | null;
    id: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: null,
    id: ''
  });

  useEffect(() => {
    checkAdminAndFetch();
    
    // Check for URL parameters
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    const selectParam = params.get('select');
    
    if (searchParam) setSearch(searchParam);
    if (selectParam) {
      // We'll handle selecting after users are fetched
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const selectParam = params.get('select');
      if (selectParam) {
        const user = users.find(u => u.id === selectParam);
        if (user) setSelectedUser(user);
      }
    }
  }, [users]);

  useEffect(() => {
    applyFilters();
    setPage(1); // Reset to first page on search/filter
  }, [users, search, filter]);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role !== 'admin') {
        window.location.href = '/403';
        return;
      }

      setIsAdmin(true);
      await fetchUsers();
    } catch (err) {
      console.error('Admin check failed:', err);
      window.location.href = '/403';
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch counts and activity for each user
      const usersWithCounts = await Promise.all((data as User[]).map(async (user) => {
        const [profilesRes, reportsRes] = await Promise.all([
          supabase.from('tracker_profiles').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('health_reports').select('created_at', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
        ]);
        return {
          ...user,
          profiles_count: profilesRes.count || 0,
          reports_count: reportsRes.count || 0,
          last_activity: reportsRes.data?.[0]?.created_at || user.created_at
        };
      }));

      setUsers(usersWithCounts);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = users;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(u => 
        u.email?.toLowerCase().includes(term) || 
        u.full_name?.toLowerCase().includes(term)
      );
    }

    if (filter !== 'all') {
      result = result.filter(u => u.provider === (filter === 'google' ? 'google' : null));
    }

    setFilteredUsers(result);
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleDeleteProfile = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Profile?',
      message: 'Are you sure you want to delete this profile? This will permanently remove all associated health reports.',
      onConfirm: () => executeDeleteProfile(id),
      type: 'profile',
      id
    });
  };

  const handleDeleteReport = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Report?',
      message: 'Are you sure you want to delete this health report? This action cannot be undone.',
      onConfirm: () => executeDeleteReport(id),
      type: 'report',
      id
    });
  };

  const executeDeleteProfile = async (id: string) => {
    try {
      const { error } = await supabase.from('tracker_profiles').delete().eq('id', id);
      if (error) throw error;
      
      // Update local state for the list counts
      setUsers(prev => prev.map(u => {
        if (u.id === selectedUser?.id) {
          return { ...u, profiles_count: Math.max(0, (u.profiles_count || 1) - 1) };
        }
        return u;
      }));

      // Trigger a re-fetch of user details to update the drawer
      if (selectedUser) {
        // We can't easily call fetchUserDetails from here as it's inside UserDetailsDrawer
        // So we'll just close and reopen or just tell the user it's deleted.
        // Better: let's move fetchUserDetails or pass a refresh trigger.
        // For now, closing the confirm modal is enough, but the drawer will still show the old list.
        // Let's fix this by adding a key to UserDetailsDrawer to force remount or similar.
        setSelectedUser({ ...selectedUser }); // Force update to trigger useEffect in drawer
      }

      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      alert('Failed to delete profile.');
    }
  };

  const executeDeleteReport = async (id: string) => {
    try {
      const { error } = await supabase.from('health_reports').delete().eq('id', id);
      if (error) throw error;

      setUsers(prev => prev.map(u => {
        if (u.id === selectedUser?.id) {
          return { ...u, reports_count: Math.max(0, (u.reports_count || 1) - 1) };
        }
        return u;
      }));

      if (selectedUser) {
        setSelectedUser({ ...selectedUser });
      }

      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      alert('Failed to delete report.');
    }
  };

  if (!isAdmin && !loading) return null;

  return (
    <div className="space-y-10">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">User Directory</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-ink/5 border border-ink/10">
              <Users className="w-3 h-3 text-mute" />
              <span className="text-[9px] font-black text-mute uppercase tracking-tighter">{users.length} Registered</span>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-ink leading-tight">Manage Users.</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mute opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-canvas border border-hairline rounded-pill text-[12px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all shadow-premium-sm"
            />
          </div>

          <div className="flex items-center bg-canvas border border-hairline rounded-pill p-1.5 shadow-premium-sm w-full sm:w-auto">
            {(['all', 'google', 'email'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-5 py-2.5 rounded-pill text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === t ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-lg relative min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas-soft border-b border-hairline">
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Avatar</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Full Name</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Email</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Provider</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Activity</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Joined</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Status</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-6 px-10"><div className="w-10 h-10 rounded-full bg-canvas-soft"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-24"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-32"></div></td>
                    <td className="py-6 px-10"><div className="h-6 bg-canvas-soft rounded-full w-16"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-20"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-20"></div></td>
                    <td className="py-6 px-10"><div className="h-6 bg-canvas-soft rounded-full w-20"></div></td>
                    <td className="py-6 px-10 text-right"><div className="h-8 w-8 bg-canvas-soft rounded-full ml-auto"></div></td>
                  </tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Search className="w-12 h-12 text-mute" />
                      <p className="text-xs font-mono font-black uppercase tracking-widest text-mute">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-canvas-soft/50 transition-colors group cursor-pointer"
                  >
                    <td className="py-6 px-10">
                      <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center font-black text-[11px] text-ink shadow-premium-sm group-hover:scale-110 transition-transform">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                    </td>
                    <td className="py-6 px-10 font-black text-ink text-sm tracking-tight">{user.full_name || 'Anonymous'}</td>
                    <td className="py-6 px-10 text-[10px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">{user.email}</td>
                    <td className="py-6 px-10">
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-pill text-[9px] font-black uppercase tracking-widest border ${
                        user.provider === 'google' ? 'bg-blue-500/5 text-blue-600 border-blue-500/10' : 'bg-ink/5 text-ink border-ink/10'
                      }`}>
                        {user.provider === 'google' && <Globe className="w-2.5 h-2.5" />}
                        {user.provider || 'Email'}
                      </div>
                    </td>
                    <td className="py-6 px-10">
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] font-black text-ink">{user.profiles_count}P / {user.reports_count}R</span>
                         <span className="text-[8px] font-mono font-bold text-mute uppercase tracking-widest opacity-40">Usage Metric</span>
                       </div>
                    </td>
                    <td className="py-6 px-10 text-[11px] font-mono font-bold text-mute opacity-60">
                      {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-6 px-10">
                       <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-status-healthy/5 border border-status-healthy/10 w-fit">
                         <div className="w-1 h-1 rounded-full bg-status-healthy animate-pulse" />
                         <span className="text-[9px] font-black text-status-healthy uppercase tracking-tighter">Active</span>
                       </div>
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-mute opacity-0 group-hover:opacity-100 transition-opacity">Details</span>
                        <div className="h-9 w-9 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mute hover:text-ink hover:border-ink hover:bg-canvas-soft transition-all active:scale-90">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="py-6 px-10 bg-canvas-soft border-t border-hairline flex items-center justify-between">
            <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest opacity-40">
              {filteredUsers.length} Users Found — Page {page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={(e) => { e.stopPropagation(); setPage(p => p - 1); }}
                className="px-6 py-2.5 rounded-xl border border-hairline bg-canvas text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink disabled:opacity-20 transition-all"
              >
                Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={(e) => { e.stopPropagation(); setPage(p => p + 1); }}
                className="px-6 py-2.5 rounded-xl border border-hairline bg-canvas text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink disabled:opacity-20 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer & Modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailsDrawer 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
            onDeleteProfile={handleDeleteProfile}
            onDeleteReport={handleDeleteReport}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
