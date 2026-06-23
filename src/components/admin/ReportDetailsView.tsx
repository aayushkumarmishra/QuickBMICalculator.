import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  Mail, 
  Globe, 
  ShieldCheck, 
  Activity, 
  FileText, 
  Calendar, 
  Download, 
  Loader2, 
  User, 
  Clock, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  formatBMI, 
  formatKcal, 
  formatWater, 
  formatRange 
} from '../../lib/format';
import { logActivity } from '../../lib/audit';

interface ReportDetailsProps {
  reportId: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  provider: string | null;
  role: string;
  created_at: string;
}

interface TrackerProfile {
  id: string;
  profile_name: string;
  relation_type: string;
  nickname?: string;
  created_at: string;
}

interface HealthReport {
  id: string;
  calculator_type: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake';
  input_data: any;
  result_data: any;
  created_at: string;
  user_id: string;
  profiles?: UserProfile | null;
  tracker_profiles?: TrackerProfile | null;
}

interface HistoryReport {
  id: string;
  calculator_type: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake';
  result_data: any;
  created_at: string;
}

const loggedOrphansDetails = new Set<string>();

export const ReportDetailsView: React.FC<ReportDetailsProps> = ({ reportId }) => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [history, setHistory] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchReportDetails();
    }
  }, [isAdmin, reportId]);

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

      setIsAdmin(true);
    } catch (err) {
      console.error('Admin check failed:', err);
      window.location.href = '/403';
    }
  };

  const fetchReportDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch single report
      const { data, error: reportError } = await supabase
        .from('health_reports')
        .select(`
          id,
          calculator_type,
          input_data,
          result_data,
          created_at,
          user_id,
          profiles:user_id (id, email, full_name, role, created_at, provider),
          tracker_profiles:tracker_profile_id (id, profile_name, relation_type, nickname, created_at)
        `)
        .eq('id', reportId)
        .single();

      if (reportError || !data) {
        setError('Report not found or database access error.');
        return;
      }

      const reportVal = data as any as HealthReport;
      setReport(reportVal);

      if (reportVal.user_id && !reportVal.profiles) {
        if (!loggedOrphansDetails.has(reportVal.user_id)) {
          loggedOrphansDetails.add(reportVal.user_id);
          logActivity(
            'ORPHAN_PROFILE_DETECTED',
            'user',
            reportVal.user_id,
            `Orphan profile detected for user ID: ${reportVal.user_id}. Report ID: ${reportVal.id}`,
            { report_id: reportVal.id }
          );
        }
      }

      // 2. Fetch history reports from same user
      const { data: historyRes } = await supabase
        .from('health_reports')
        .select('id, calculator_type, result_data, created_at')
        .eq('user_id', reportVal.user_id)
        .neq('id', reportVal.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setHistory((historyRes || []) as any[]);
    } catch (err) {
      console.error('Error fetching report details:', err);
      setError('An error occurred while fetching report details.');
    } finally {
      setLoading(false);
    }
  };

  const getReportSummaryValue = (type: string, result: any): string => {
    if (!result) return 'N/A';
    try {
      switch (type) {
        case 'bmi': 
          return formatBMI(result.bmi || 0);
        case 'bmr': 
          return formatKcal(result.bmr || 0);
        case 'calorie': 
          return formatKcal(result.maintenance || 0);
        case 'ideal_weight': 
          return result.range ? formatRange(result.range.min, result.range.max, 'kg') : 'N/A';
        case 'water_intake': 
          return formatWater(result.waterIntake || 0);
        default: 
          return 'N/A';
      }
    } catch (e) {
      return 'Error';
    }
  };

  const getReportCategoryValue = (type: string, result: any): string => {
    if (!result) return '';
    if (type === 'bmi') {
      return result.category || 'Unknown';
    }
    return '';
  };

  // CSV Export
  const handleExportCSV = async () => {
    if (!report) return;

    const headers = ["Report Metric", "Value"];
    const info = [
      ["Report Identifier", report.id],
      ["Generated Date", new Date(report.created_at).toLocaleString()],
      ["Calculator Type", report.calculator_type.toUpperCase().replace('_', ' ')],
      ["User Reference ID", report.user_id],
      ["User Full Name", report.profiles?.full_name || "Anonymous"],
      ["User Email Address", report.profiles?.email || "N/A"],
      ["Tracker Profile Name", report.tracker_profiles?.profile_name || "Self"],
      ["Tracker Profile Relation", report.tracker_profiles?.relation_type || "self"],
      [],
      ["CALCULATOR INPUT VARIABLES"]
    ];

    // Append inputs dynamically
    Object.entries(report.input_data || {}).forEach(([key, val]) => {
      info.push([key.replace(/([A-Z])/g, ' $1').trim().toUpperCase(), String(val)]);
    });

    info.push([], ["CALCULATOR OUTCOME RESULTS"]);

    // Append results dynamically
    Object.entries(report.result_data || {}).forEach(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        info.push([key.toUpperCase(), JSON.stringify(val)]);
      } else {
        info.push([key.toUpperCase(), String(val)]);
      }
    });

    const csvContent = info.map(e => e.map(val => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${report.calculator_type}_${report.id.slice(0, 8)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log report export
    try {
      await logActivity('Report Export', 'report', reportId || null, `Single report exported as CSV`);
    } catch (logErr) {
      console.error('Failed to log report export:', logErr);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-ink opacity-20" />
        <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest mt-4">Retrieving Report Details...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-ink mb-2">Report Not Found</h2>
          <p className="text-sm text-mute font-medium leading-relaxed">{error || "The health report registry record was not found."}</p>
        </div>
        <a 
          href="/admin/reports"
          className="h-12 px-6 bg-ink text-canvas rounded-pill font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <a 
          href="/admin/reports"
          className="inline-flex items-center gap-3 text-mute hover:text-ink transition-colors group"
        >
          <div className="w-9 h-9 rounded-full bg-canvas border border-hairline flex items-center justify-center group-hover:-translate-x-1 transition-transform shadow-premium-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Reports</span>
        </a>

        <button 
          onClick={handleExportCSV}
          className="h-12 px-6 bg-canvas border border-hairline text-ink rounded-pill font-black text-[10px] uppercase tracking-widest hover:bg-canvas-soft active:scale-95 transition-all flex items-center gap-2.5 shadow-premium-sm"
        >
          <Download className="w-4 h-4" />
          Export Report CSV
        </button>
      </div>

      {/* Main Grid: User & Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Card */}
        <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 shadow-premium-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {report.user_id && !report.profiles ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center font-black text-[11px] text-red-600 shadow-premium-sm uppercase">
                  O
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-red-600">Orphaned User</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-mono font-bold text-red-500 uppercase tracking-widest opacity-60">Account Holder Missing</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest bg-red-500/5 text-red-600 border border-red-500/10">
                      Orphan
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center font-black text-[11px] text-ink shadow-premium-sm uppercase">
                  {report.profiles?.full_name?.charAt(0) || report.profiles?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-ink">{report.profiles?.full_name || 'Anonymous User'}</h4>
                  <p className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Account Holder</p>
                </div>
              </div>
            )}

            <div className="w-full border-t border-hairline pt-4 space-y-3 font-bold">
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">User ID</span>
                <span className="text-[10px] text-ink font-mono truncate max-w-[140px]">{report.user_id}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">Email</span>
                <span className={`text-[10px] font-mono ${report.user_id && !report.profiles ? 'text-red-500 font-bold' : 'text-ink opacity-80'}`}>
                  {report.user_id && !report.profiles ? 'Profile Missing' : (report.profiles?.email || 'N/A')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">Privilege</span>
                <span className={`text-[10px] uppercase tracking-tighter ${report.user_id && !report.profiles ? 'text-red-500 font-bold' : 'text-ink'}`}>
                  {report.user_id && !report.profiles ? 'N/A' : (report.profiles?.role || 'user')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">Auth Source</span>
                <span className={`text-[10px] capitalize tracking-tighter ${report.user_id && !report.profiles ? 'text-red-500 font-bold' : 'text-ink'}`}>
                  {report.user_id && !report.profiles ? 'N/A' : (report.profiles?.provider || 'Email/Password')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 shadow-premium-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center font-black text-[11px] text-ink shadow-premium-sm uppercase">
                {report.tracker_profiles?.profile_name?.charAt(0) || 'S'}
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight text-ink">{report.tracker_profiles?.profile_name || 'Self'}</h4>
                <p className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">Tracker Profile</p>
              </div>
            </div>

            <div className="w-full border-t border-hairline pt-4 space-y-3 font-bold">
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">Profile ID</span>
                <span className="text-[10px] text-ink font-mono truncate max-w-[140px]">{report.tracker_profile_id}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">Relationship</span>
                <span className="text-[10px] text-ink uppercase tracking-widest">{report.tracker_profiles?.relation_type || 'self'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">Nickname</span>
                <span className="text-[10px] text-ink">{report.tracker_profiles?.nickname || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-mute opacity-60">Profile Created</span>
                <span className="text-[10px] text-ink">
                  {report.tracker_profiles?.created_at ? new Date(report.tracker_profiles.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Report Overview Card */}
        <div className="bg-ink text-canvas rounded-[2.5rem] p-8 shadow-premium-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-canvas" />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-xl font-black tracking-tight uppercase">
                  {report.calculator_type.replace('_', ' ')} Report
                </h4>
                <p className="text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest">Type Identifier</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2 font-bold text-white/80">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Report UUID</span>
                <span className="text-[10px] font-mono truncate max-w-[140px]">{report.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Date Saved</span>
                <span className="text-[10px]">{new Date(report.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Parameters Display Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Parameters List */}
        <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 sm:p-10 shadow-premium-sm space-y-6">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-mute opacity-60" />
            <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.25em]">Input Parameters</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(report.input_data || {}).map(([key, val]) => (
              <div key={key} className="p-5 bg-canvas-soft border border-hairline rounded-2xl space-y-1">
                <span className="text-[8px] font-mono font-black text-mute uppercase tracking-widest opacity-60">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <p className="text-lg font-black text-ink">
                  {key === 'height' ? `${val} cm` : key === 'weight' ? `${val} kg` : key === 'age' ? `${val} yrs` : String(val)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Calculated Results */}
        <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 sm:p-10 shadow-premium-sm space-y-6">
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-mute opacity-60" />
            <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.25em]">Calculated Outcome</h4>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-canvas-soft border border-hairline rounded-3xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest">Main Result Value</span>
                <p className="text-4xl font-black text-ink mt-1">
                  {getReportSummaryValue(report.calculator_type, report.result_data)}
                </p>
              </div>

              {/* Status Badge */}
              {report.calculator_type === 'bmi' && getReportCategoryValue(report.calculator_type, report.result_data) && (
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                  getReportCategoryValue(report.calculator_type, report.result_data).toLowerCase() === 'normal'
                    ? 'bg-status-healthy/5 text-status-healthy border-status-healthy/10 shadow-premium-sm'
                    : getReportCategoryValue(report.calculator_type, report.result_data).toLowerCase() === 'underweight'
                    ? 'bg-blue-500/5 text-blue-600 border-blue-500/10'
                    : getReportCategoryValue(report.calculator_type, report.result_data).toLowerCase() === 'overweight'
                    ? 'bg-amber-500/5 text-amber-600 border-amber-500/10'
                    : 'bg-red-500/5 text-red-600 border-red-500/10'
                }`}>
                  {getReportCategoryValue(report.calculator_type, report.result_data)}
                </div>
              )}
            </div>

            {/* Display other calculation sub-fields if present */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(report.result_data || {}).map(([key, val]) => {
                // Skip displaying the main values in general view again
                if (['bmi', 'bmr', 'maintenance', 'waterIntake', 'category'].includes(key)) return null;

                // Handle printing ranges or numbers
                let displayVal = '';
                if (typeof val === 'object' && val !== null) {
                  if ('min' in val && 'max' in val) {
                    displayVal = `${val.min} – ${val.max}`;
                  } else {
                    displayVal = JSON.stringify(val);
                  }
                } else {
                  displayVal = String(val);
                }

                return (
                  <div key={key} className="py-3 px-4 border-b border-hairline flex items-center justify-between text-xs font-bold">
                    <span className="text-[9px] font-mono text-mute uppercase tracking-widest opacity-60">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-ink truncate max-w-[160px]">{displayVal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* User's Previous Report History Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink" />
            <h3 className="text-lg font-black tracking-tight text-ink">User's Report History</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-canvas border border-hairline text-[9px] font-mono font-black text-mute">
            {history.length} previous reports
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-12 border border-dashed border-hairline rounded-[2rem] bg-canvas text-center">
            <p className="text-xs font-mono font-bold text-mute uppercase tracking-widest opacity-50">No other reports saved by this user</p>
          </div>
        ) : (
          <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas-soft border-b border-hairline">
                    <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Date</th>
                    <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Calculator Type</th>
                    <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Result Outcome</th>
                    <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Category</th>
                    <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {history.map((hist) => (
                    <tr 
                      key={hist.id} 
                      onClick={() => window.location.href = `/admin/reports/${hist.id}`}
                      className="hover:bg-canvas-soft/40 transition-colors group cursor-pointer"
                    >
                      <td className="py-5 px-8 text-[11px] font-mono font-bold text-mute opacity-80">
                        {new Date(hist.created_at).toLocaleString()}
                      </td>
                      <td className="py-5 px-8 font-black text-ink text-xs uppercase tracking-wider">
                        {hist.calculator_type.replace('_', ' ')}
                      </td>
                      <td className="py-5 px-8 text-xs font-mono font-bold text-ink">
                        {getReportSummaryValue(hist.calculator_type, hist.result_data)}
                      </td>
                      <td className="py-5 px-8 text-xs font-bold text-ink">
                        {getReportCategoryValue(hist.calculator_type, hist.result_data) ? (
                          <span className="px-2.5 py-1 rounded-pill bg-ink/5 border border-ink/10 text-[9px] font-black uppercase tracking-widest text-mute">
                            {getReportCategoryValue(hist.calculator_type, hist.result_data)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-mute opacity-30">—</span>
                        )}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex items-center justify-end">
                          <span className="text-[8px] font-mono font-black uppercase tracking-widest text-mute opacity-0 group-hover:opacity-65 transition-opacity mr-2">Audit Report</span>
                          <div className="w-8 h-8 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors shadow-premium-sm">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
