import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  User, 
  Mail, 
  Shield, 
  Lock, 
  Camera, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Clock,
  History,
  Key,
  Database,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_login_at?: string;
  provider?: string;
}

const Toast: React.FC<{ 
  message: string; 
  type: 'success' | 'error'; 
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
        type === 'success' ? 'bg-status-healthy/10 border-status-healthy/20 text-status-healthy' : 'bg-red-500/10 border-red-500/20 text-red-600'
      }`}
    >
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-[11px] font-black uppercase tracking-widest">{message}</span>
    </motion.div>
  );
};

export const AdminSettings: React.FC = () => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        provider: session.user.app_metadata.provider,
        last_login_at: session.user.last_sign_in_at
      });
      setFullName(data.full_name || '');
    } catch (err) {
      console.error('Error fetching admin profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile?.id);

      if (error) throw error;
      setToast({ message: 'Profile updated successfully', type: 'success' });
      setProfile(prev => prev ? { ...prev, full_name: fullName } : null);
    } catch (err) {
      setToast({ message: 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setToast({ message: 'Password changed successfully', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to change password', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-ink opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">System Control</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-status-healthy/10 border border-status-healthy/20">
            <Shield className="w-3 h-3 text-status-healthy" />
            <span className="text-[9px] font-black text-status-healthy uppercase tracking-tighter">Admin Root</span>
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-ink leading-tight">Settings.</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Forms */}
        <div className="lg:col-span-2 space-y-10">
          {/* Profile Section */}
          <section className="bg-canvas border border-hairline rounded-[2.5rem] p-8 sm:p-10 shadow-premium-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-ink/[0.02] to-transparent pointer-events-none" />
            <div className="space-y-8">
              <div className="flex items-center gap-4 pb-6 border-b border-hairline">
                <div className="p-3 rounded-2xl bg-canvas-soft border border-hairline">
                  <User className="w-5 h-5 text-ink" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-ink">Admin Profile</h3>
                  <p className="text-xs text-mute font-medium">Update your public identity on the platform.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-mute uppercase tracking-widest ml-4">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-14 px-6 bg-canvas-soft border border-hairline rounded-pill text-[13px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-mute uppercase tracking-widest ml-4">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={profile?.email}
                      disabled
                      className="w-full h-14 px-6 bg-canvas-soft/50 border border-hairline rounded-pill text-[13px] font-bold text-ink/40 cursor-not-allowed pr-12"
                    />
                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-mute opacity-20" />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="h-14 px-10 bg-ink text-canvas rounded-pill font-black text-[11px] uppercase tracking-[0.2em] shadow-premium-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-canvas border border-hairline rounded-[2.5rem] p-8 sm:p-10 shadow-premium-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/[0.02] to-transparent pointer-events-none" />
            <div className="space-y-8">
              <div className="flex items-center gap-4 pb-6 border-b border-hairline">
                <div className="p-3 rounded-2xl bg-canvas-soft border border-hairline">
                  <Lock className="w-5 h-5 text-ink" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-ink">Account Security</h3>
                  <p className="text-xs text-mute font-medium">Manage your credentials and authentication.</p>
                </div>
              </div>

              {profile?.provider === 'google' ? (
                <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center shadow-premium-sm shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-black text-ink">Managed by Google</p>
                    <p className="text-xs text-mute font-medium opacity-60">Authentication is handled via your Google account.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-black text-mute uppercase tracking-widest ml-4">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-14 px-6 bg-canvas-soft border border-hairline rounded-pill text-[13px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-black text-mute uppercase tracking-widest ml-4">Confirm Password</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-14 px-6 bg-canvas-soft border border-hairline rounded-pill text-[13px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={saving}
                      className="h-14 px-10 bg-canvas border border-hairline text-ink rounded-pill font-black text-[11px] uppercase tracking-[0.2em] shadow-premium-sm hover:bg-canvas-soft active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Meta Info */}
        <div className="space-y-8">
          {/* Avatar / Identity Card */}
          <div className="bg-ink text-canvas rounded-[2.5rem] p-10 shadow-premium-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="relative group/avatar">
                <div className="w-24 h-24 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-4xl shadow-inner relative overflow-hidden">
                   {fullName.charAt(0) || profile?.email.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={() => setToast({ message: 'Avatar upload coming soon', type: 'error' })}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-canvas border border-hairline text-ink flex items-center justify-center shadow-premium-lg hover:scale-110 active:scale-90 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-xl font-black tracking-tighter">{fullName || 'Admin'}</h4>
                <div className="flex items-center justify-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-mono font-black uppercase tracking-widest text-status-healthy">Active Admin</span>
                </div>
              </div>

              <div className="w-full pt-6 border-t border-white/10 space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Privilege</span>
                   <span className="text-[10px] font-black uppercase tracking-tighter capitalize">{profile?.role || 'Administrator'}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Source</span>
                   <span className="text-[10px] font-black uppercase tracking-tighter capitalize">{profile?.provider || 'Email'}</span>
                 </div>
              </div>
            </div>
          </div>

          {/* System Info Card */}
          <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 shadow-premium-sm space-y-8">
             <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Security Metadata</h4>
             
             <div className="space-y-5">
               <div className="flex items-center gap-4">
                 <div className="p-2.5 rounded-xl bg-canvas-soft border border-hairline">
                   <History className="w-4 h-4 text-mute opacity-60" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-40">Last Login</span>
                   <span className="text-[11px] font-black text-ink">{profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'Just now'}</span>
                 </div>
               </div>

               <div className="flex items-center gap-4">
                 <div className="p-2.5 rounded-xl bg-canvas-soft border border-hairline">
                   <Clock className="w-4 h-4 text-mute opacity-60" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-40">Member Since</span>
                   <span className="text-[11px] font-black text-ink">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
                 </div>
               </div>

               <div className="flex items-center gap-4">
                 <div className="p-2.5 rounded-xl bg-canvas-soft border border-hairline">
                   <Monitor className="w-4 h-4 text-mute opacity-60" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-40">User Agent</span>
                   <span className="text-[11px] font-black text-ink truncate max-w-[150px]">Chrome / Windows</span>
                 </div>
               </div>
             </div>

             <div className="pt-6 border-t border-hairline">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ink/5 border border-ink/10">
                   <Database className="w-3 h-3 text-ink opacity-40" />
                   <span className="text-[9px] font-mono font-black uppercase tracking-tighter text-ink opacity-60">System Registry Connected</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
