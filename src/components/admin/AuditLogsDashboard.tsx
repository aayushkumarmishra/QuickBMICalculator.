import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, ShieldAlert, Loader2, History, User, AlertCircle, Search, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: any | null;
  new_value: any | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  email: string | null;
  action: string | null;
  description: string | null;
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
       <AlertCircle className="w-5 h-5" />}
      <span className="text-[11px] font-black uppercase tracking-widest">{message}</span>
    </motion.div>
  );
};

export const AuditLogsDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchAuditLogs();
  }, [debouncedSearchQuery]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('reportId');

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportId) {
        query = query.eq('entity_id', reportId);
      }

      if (debouncedSearchQuery.trim()) {
        const term = debouncedSearchQuery.trim();
        query = query.or(`action.ilike.%${term}%,email.ilike.%${term}%,entity_type.ilike.%${term}%,description.ilike.%${term}%`).limit(200);
      } else if (!reportId) {
        query = query.limit(50); // Limit to recent 50 logs when not searching
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLogs(data as AuditLog[] || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to fetch audit logs: ' + err.message);
      setToast({ message: 'Failed to fetch audit logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-ink opacity-20" />
        <p className="mt-4 text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Loading Audit Logs</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-600 shadow-premium-sm">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <p className="font-bold text-sm tracking-tight">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">System Registry</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/5 border border-blue-500/10">
            <History className="w-3 h-3 text-blue-500" />
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Real-time Stream</span>
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-ink leading-tight">Audit Logs</h1>
      </div>

      <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-lg relative">
        <div className="p-8 sm:p-10 flex items-center justify-between border-b border-hairline">
          <div className="relative group max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="Filter events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-4 bg-canvas-soft border border-hairline rounded-pill text-[11px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all w-48 focus:w-64"
            />
          </div>
          <button 
            onClick={fetchAuditLogs}
            disabled={loading}
            className="h-10 px-5 rounded-pill bg-canvas border border-hairline text-ink font-black text-[10px] uppercase tracking-widest hover:bg-canvas-soft transition-all shadow-premium-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas-soft border-b border-hairline">
                <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Timestamp</th>
                <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Event</th>
                <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">User</th>
                <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Context</th>
                <th className="py-5 px-8 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">IP / Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center text-mute font-black uppercase tracking-widest text-[10px] opacity-40 italic">No Matching Audit Logs Found</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-canvas-soft/50 transition-colors">
                    <td className="py-6 px-8 text-[10px] font-mono font-bold text-mute opacity-60">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-6 px-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-[9px] font-black uppercase tracking-widest border bg-ink/5 text-ink border-ink/10">
                        {log.event_type}
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      {log.email ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center font-black text-[10px]">
                            {log.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-ink text-xs leading-tight">{log.email || 'Anonymous'}</span>
                            <span className="text-[9px] font-mono font-bold text-mute opacity-60">{log.email}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-mute opacity-60">
                          <User className="w-4 h-4" />
                          <span className="text-xs">System / Unknown</span>
                        </div>
                      )}
                    </td>
                    <td className="py-6 px-8 text-xs font-mono text-mute">
                      {log.entity_type && log.entity_id ? `${log.entity_type}: ${log.entity_id.substring(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="py-6 px-8 text-xs font-mono text-mute opacity-60">
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};