import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Search, 
  Mail, 
  Globe, 
  FileText, 
  Loader2,
  Activity,
  ChevronRight,
  User as UserIcon,
  MoreVertical,
  Download,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  formatBMI, 
  formatKcal, 
  formatWater, 
  formatRange 
} from '../../lib/format';
import { logActivity } from '../../lib/audit';

interface User {
  id: string;
  email: string;
  full_name: string;
  provider: string | null;
  created_at: string;
  role?: string;
  last_login_at?: string;
  profiles_count?: number;
  reports_count?: number;
  last_activity?: string;
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

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'google' | 'email'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserEmail, setDeleteUserEmail] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'user' as 'user' | 'admin' });
  const [createUserErrors, setCreateUserErrors] = useState<{ [key: string]: string }>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, google: 0, email: 0, admins: 0 });

  const itemsPerPage = 10;

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  // Re-fetch users whenever page, search, filter, or sorting changes
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, page, search, filter, sortOrder]);

  const checkAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        window.location.href = '/403';
        return;
      }

      setCurrentUserId(session.user.id);
      setIsAdmin(true);
    } catch (err) {
      console.error('Admin check failed:', err);
      window.location.href = '/403';
    }
  };

  const fetchStats = async () => {
    try {
      const [totalRes, googleRes, emailRes, adminsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('provider', 'google'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).or('provider.eq.email,provider.is.null'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
      ]);

      setStats({
        total: totalRes.count || 0,
        google: googleRes.count || 0,
        email: emailRes.count || 0,
        admins: adminsRes.count || 0
      });
    } catch (e) {
      console.error('Error fetching dashboard statistics:', e);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users_with_counts', {
        search_term: search,
        provider_filter: filter,
        sort_order: sortOrder,
        limit_val: itemsPerPage,
        offset_val: (page - 1) * itemsPerPage
      });
      if (error) throw error;

      const total = data && data.length > 0 ? data[0].total_count : 0;
      setTotalCount(total);
      setUsers(data || []);
    } catch (err) {
      console.error('Error retrieving users from database:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    if (deleteUserId === currentUserId) {
      setToast({ message: 'Accidental self-deletion protection: you cannot delete your own account', type: 'error' });
      setDeleteUserId(null);
      setDeleteUserEmail('');
      return;
    }
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: deleteUserId }
      });

      if (error || !data?.success) {
        const message = data?.error || 'Failed to delete user';
        setToast({ message, type: 'error' });
        return;
      }

      setUsers(prev => prev.filter(u => u.id !== deleteUserId));
      setTotalCount(prev => prev - 1);
      setToast({ message: 'User deleted successfully', type: 'success' });
      setDeleteUserId(null);
      setDeleteUserEmail('');
      
      // Refresh stats to reconcile numbers
      fetchStats();
    } catch (err: any) {
      setToast({ message: 'Failed to delete user', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const validateCreateUserForm = () => {
    const errors: { [key: string]: string } = {};
    if (!createUserForm.fullName.trim()) errors.fullName = 'Full name is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!createUserForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(createUserForm.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!createUserForm.password) {
      errors.password = 'Password is required';
    } else if (createUserForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (createUserForm.password !== createUserForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setCreateUserErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateCreateUserForm()) return;
    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          fullName: createUserForm.fullName.trim(),
          email: createUserForm.email.trim(),
          password: createUserForm.password,
          role: createUserForm.role,
        },
      });

      if (error || !data?.success) {
        const message = data?.error || 'Failed to create user';
        setCreateUserErrors({ submit: message });
        setToast({ message, type: 'error' });
        return;
      }

      setToast({ message: 'User created successfully', type: 'success' });
      setShowCreateUserModal(false);
      setCreateUserForm({ fullName: '', email: '', password: '', confirmPassword: '', role: 'user' });
      setCreateUserErrors({});

      fetchUsers();
      fetchStats();

    } catch (err: any) {
      setToast({ message: 'Failed to create user', type: 'error' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // CSV Export for a single user
  const handleExportUser = async (user: User) => {
    try {
      // Log export action
      logActivity(
        'Admin Export',
        'user',
        user.id,
        `Exported database profile history for user: ${user.full_name || user.email} (${user.id})`
      );

      const [trackersRes, reportsRes] = await Promise.all([
        supabase.from('tracker_profiles').select('*').eq('user_id', user.id),
        supabase.from('health_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      const trackers = trackersRes.data || [];
      const reports = reportsRes.data || [];

      const headers = [
        "Report ID", 
        "Date Generated", 
        "Calculator Type", 
        "Result Key", 
        "Result Value", 
        "BMI Category"
      ];

      const getReportSummaryValue = (r: any): string => {
        const { calculator_type, result_data } = r;
        if (!result_data) return 'N/A';
        try {
          switch (calculator_type) {
            case 'bmi': return formatBMI(result_data.bmi || 0);
            case 'bmr': return formatKcal(result_data.bmr || 0);
            case 'calorie': return formatKcal(result_data.maintenance || 0);
            case 'ideal_weight': return result_data.range ? formatRange(result_data.range.min, result_data.range.max, 'kg') : 'N/A';
            case 'water_intake': return formatWater(result_data.waterIntake || 0);
            default: return 'N/A';
          }
        } catch (e) {
          return 'Error';
        }
      };

      const getReportCategoryValue = (r: any): string => {
        if (r.calculator_type === 'bmi' && r.result_data) {
          return r.result_data.category || 'Unknown';
        }
        return '';
      };

      const rows = reports.map(r => [
        r.id,
        new Date(r.created_at).toLocaleString(),
        r.calculator_type.replace('_', ' '),
        r.calculator_type === 'bmi' ? 'BMI Score' : r.calculator_type === 'bmr' ? 'BMR Calories' : r.calculator_type === 'calorie' ? 'Daily Allowance' : r.calculator_type === 'ideal_weight' ? 'Weight Range' : 'Water Intake',
        getReportSummaryValue(r),
        getReportCategoryValue(r)
      ]);

      const userInfo = [
        ["User Account Information"],
        ["User ID", user.id],
        ["Full Name", user.full_name || "Anonymous"],
        ["Email", user.email],
        ["Authentication Provider", user.provider || "Email/Password"],
        ["Account Privilege Role", user.role || "user"],
        ["Account Registration Date", new Date(user.created_at).toLocaleString()],
        ["Last Login Signature", user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "N/A"],
        [],
        ["Managed Tracker Profiles count", trackers.length],
        ...trackers.map((t, idx) => [
          `Tracker Profile #${idx + 1}`,
          `Name: ${t.profile_name}${t.nickname ? ` (${t.nickname})` : ''}`,
          `Relation: ${t.relation_type}`,
          `Created: ${new Date(t.created_at).toLocaleDateString()}`
        ]),
        [],
        ["Health Reports Database History"],
        headers
      ];

      const csvContent = userInfo.map(e => e.map(val => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(",")).join("\n") + "\n" +
                         rows.map(e => e.map(val => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `user_data_${user.full_name?.toLowerCase().replace(/\s+/g, '_') || user.id}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (e) {
      console.error('CSV compilation failed:', e);
      alert('Failed to compile and export user data.');
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!isAdmin) return null;

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
      
      {/* Header & Title */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">User Directory</span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-ink/5 border border-ink/10">
                <Users className="w-3 h-3 text-mute" />
                <span className="text-[9px] font-black text-mute uppercase tracking-tighter">{stats.total} Registered</span>
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-ink leading-tight">Manage Users</h1>
          </div>
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="h-12 px-6 bg-ink text-canvas rounded-pill font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
        {/* Search & Filter Controls Row */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full">
          {/* Real-time search */}
          <div className="relative group w-full xl:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mute opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-12 pl-11 pr-4 bg-canvas border border-hairline rounded-pill text-[12px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all shadow-premium-sm"
            />
          </div>

          {/* Filter & Sort Group */}
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Provider Filter */}
            <div className="flex items-center bg-canvas border border-hairline rounded-pill p-1.5 shadow-premium-sm overflow-x-auto no-scrollbar">
              {(['all', 'google', 'email'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setFilter(t); setPage(1); }}
                  className={`px-5 py-2.5 rounded-pill text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filter === t ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink'
                  }`}
                >
                  {t === 'all' ? 'All Providers' : t === 'google' ? 'Google' : 'Email/Pass'}
                </button>
              ))}
            </div>

            {/* Date Sorting */}
            <div className="flex items-center bg-canvas border border-hairline rounded-pill p-1.5 shadow-premium-sm">
              {(['newest', 'oldest'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSortOrder(s); setPage(1); }}
                  className={`px-4 py-2.5 rounded-pill text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    sortOrder === s ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink'
                  }`}
                >
                  {s === 'newest' ? 'Newest' : 'Oldest'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top statistics overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Total Users</span>
            <p className="text-3xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.total}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Google Accounts</span>
            <p className="text-3xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.google}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Email Accounts</span>
            <p className="text-3xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.email}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Admin Accounts</span>
            <p className="text-3xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.admins}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-ink/5 border border-ink/10 flex items-center justify-center text-ink group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
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
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Name</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Email</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Provider</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Role</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Created Date</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Status</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em] text-right">Actions</th>
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
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-16"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-20"></div></td>
                    <td className="py-6 px-10"><div className="h-6 bg-canvas-soft rounded-full w-20"></div></td>
                    <td className="py-6 px-10 text-right"><div className="h-8 w-8 bg-canvas-soft rounded-full ml-auto"></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Search className="w-12 h-12 text-mute" />
                      <p className="text-xs font-mono font-black uppercase tracking-widest text-mute">No registered users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => window.location.href = `/admin/users/${user.id}`}
                    className="hover:bg-canvas-soft/50 transition-colors group cursor-pointer"
                  >
                    <td className="py-6 px-10">
                      <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center font-black text-[11px] text-ink shadow-premium-sm group-hover:scale-110 transition-transform">
                        {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
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

                    <td className="py-6 px-10 text-xs font-mono font-bold text-ink uppercase tracking-wider">{user.role || 'user'}</td>

                    <td className="py-6 px-10 text-[11px] font-mono font-bold text-mute opacity-60">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-6 px-10">
                       <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-status-healthy/5 border border-status-healthy/10 w-fit">
                         <div className="w-1.5 h-1.5 rounded-full bg-status-healthy animate-pulse" />
                         <span className="text-[9px] font-black text-status-healthy uppercase tracking-tighter">Active</span>
                       </div>
                    </td>

                    {/* Action dropdown cell */}
                    <td className="py-6 px-10 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          if (activeDropdown === user.id) {
                            setActiveDropdown(null);
                            setDropdownPosition(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const DROPDOWN_HEIGHT = 200;
                          const DROPDOWN_WIDTH = 192;
                          const idealTop = rect.bottom + 8;
                          const maxTop = window.innerHeight - DROPDOWN_HEIGHT - 8;
                          const top = Math.min(idealTop, maxTop);
                          setDropdownPosition({
                            top,
                            left: rect.right - DROPDOWN_WIDTH,
                          });
                          setActiveDropdown(user.id);
                        }}
                        className="h-9 w-9 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mute hover:text-ink hover:border-ink hover:bg-canvas-soft transition-all ml-auto relative z-10 active:scale-90"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                       <AnimatePresence>
                        {activeDropdown === user.id && dropdownPosition && (
                          <div 
                            key={`dropdown-wrapper-${user.id}`} 
                            className="fixed z-30" 
                            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                          >
                            <div className="fixed inset-0 z-20" onClick={() => { setActiveDropdown(null); setDropdownPosition(null); }} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 5 }}
                              className="relative z-30 w-48 bg-canvas border border-hairline rounded-[1.25rem] shadow-premium-2xl py-2 text-left overflow-hidden"
                            >
                              <button 
                                onClick={() => window.location.href = `/admin/users/${user.id}`}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink hover:bg-canvas-soft transition-colors text-left"
                              >
                                <UserIcon className="w-3.5 h-3.5" />
                                View User
                              </button>
                              
                              <button 
                                onClick={() => window.location.href = `/admin/users/${user.id}`}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink hover:bg-canvas-soft transition-colors text-left"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                View Reports
                              </button>
                              
                              <button 
                                onClick={() => { handleExportUser(user); setActiveDropdown(null); }}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink hover:bg-canvas-soft transition-colors text-left border-t border-hairline pt-3 mt-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Export CSV
                              </button>
                              
                              <button 
                                onClick={() => { 
                                  setDeleteUserId(user.id); 
                                  setDeleteUserEmail(user.email || ''); 
                                  setActiveDropdown(null); 
                                }}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/5 transition-colors text-left border-t border-hairline pt-3 mt-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete User
                              </button>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="py-6 px-10 bg-canvas-soft border-t border-hairline flex items-center justify-between">
            <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest opacity-40">
              {totalCount} Users Registered — Page {page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-6 py-2.5 rounded-xl border border-hairline bg-canvas text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink disabled:opacity-20 transition-all active:scale-95"
              >
                Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-6 py-2.5 rounded-xl border border-hairline bg-canvas text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink disabled:opacity-20 transition-all active:scale-95"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-canvas border border-hairline rounded-[2rem] p-10 shadow-premium-2xl max-w-md w-full mx-4"
          >
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tighter text-ink">Delete User</h3>
                <p className="text-sm text-mute font-medium">Are you sure you want to delete</p>
                <p className="text-sm font-black text-ink">{deleteUserEmail}</p>
                <p className="text-xs text-red-500 font-bold mt-2">This action cannot be undone.</p>
              </div>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => { setDeleteUserId(null); setDeleteUserEmail(''); }}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-pill border border-hairline text-ink font-black text-[11px] uppercase tracking-widest hover:bg-canvas-soft transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-pill bg-red-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-canvas border border-hairline rounded-[2rem] p-8 sm:p-10 shadow-premium-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col gap-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tighter text-ink">Create User</h3>
                <p className="text-sm text-mute font-medium">Add a new user or admin account.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-mute mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={createUserForm.fullName}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full h-12 px-4 rounded-2xl border border-hairline bg-canvas-soft text-sm font-bold text-ink focus:outline-none focus:border-ink transition-colors"
                    placeholder="Jane Doe"
                  />
                  {createUserErrors.fullName && <p className="text-xs text-red-500 font-bold mt-1">{createUserErrors.fullName}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-mute mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full h-12 px-4 rounded-2xl border border-hairline bg-canvas-soft text-sm font-bold text-ink focus:outline-none focus:border-ink transition-colors"
                    placeholder="jane@example.com"
                  />
                  {createUserErrors.email && <p className="text-xs text-red-500 font-bold mt-1">{createUserErrors.email}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-mute mb-1.5 block">Password</label>
                  <input
                    type="password"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full h-12 px-4 rounded-2xl border border-hairline bg-canvas-soft text-sm font-bold text-ink focus:outline-none focus:border-ink transition-colors"
                    placeholder="At least 8 characters"
                  />
                  {createUserErrors.password && <p className="text-xs text-red-500 font-bold mt-1">{createUserErrors.password}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-mute mb-1.5 block">Confirm Password</label>
                  <input
                    type="password"
                    value={createUserForm.confirmPassword}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full h-12 px-4 rounded-2xl border border-hairline bg-canvas-soft text-sm font-bold text-ink focus:outline-none focus:border-ink transition-colors"
                    placeholder="Re-enter password"
                  />
                  {createUserErrors.confirmPassword && <p className="text-xs text-red-500 font-bold mt-1">{createUserErrors.confirmPassword}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-mute mb-1.5 block">Role</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateUserForm(prev => ({ ...prev, role: 'user' }))}
                      className={`flex-1 h-12 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                        createUserForm.role === 'user' ? 'bg-ink text-canvas border-ink' : 'border-hairline text-mute hover:text-ink'
                      }`}
                    >
                      User
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateUserForm(prev => ({ ...prev, role: 'admin' }))}
                      className={`flex-1 h-12 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                        createUserForm.role === 'admin' ? 'bg-ink text-canvas border-ink' : 'border-hairline text-mute hover:text-ink'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                {createUserErrors.submit && (
                  <p className="text-xs text-red-500 font-bold text-center">{createUserErrors.submit}</p>
                )}
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setCreateUserForm({ fullName: '', email: '', password: '', confirmPassword: '', role: 'user' });
                    setCreateUserErrors({});
                  }}
                  disabled={isCreatingUser}
                  className="flex-1 h-12 rounded-pill border border-hairline text-ink font-black text-[11px] uppercase tracking-widest hover:bg-canvas-soft transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={isCreatingUser}
                  className="flex-1 h-12 rounded-pill bg-ink text-canvas font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create User
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
