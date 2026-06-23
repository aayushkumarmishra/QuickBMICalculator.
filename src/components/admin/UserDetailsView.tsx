import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Loader2, 
  Search, 
  User, 
  TrendingUp, 
  Clock 
} from 'lucide-react';
import { 
  formatBMI, 
  formatKcal, 
  formatWater, 
  formatRange 
} from '../../lib/format';
import { logActivity } from '../../lib/audit';

interface UserDetailsProps {
  userId: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  provider: string | null;
  role: string;
  created_at: string;
  last_login_at?: string;
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
}

export const UserDetailsView: React.FC<UserDetailsProps> = ({ userId }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [trackers, setTrackers] = useState<TrackerProfile[]>([]);
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filters on Reports
  const [reportSearch, setReportSearch] = useState('');
  
  // Pagination on Reports
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const filteredReports = useMemo(() => {
    let result = reports;
    if (reportSearch) {
      const term = reportSearch.toLowerCase();
      result = result.filter(r => 
        r.calculator_type.toLowerCase().includes(term) ||
        getReportSummaryValue(r).toLowerCase().includes(term) ||
        getReportCategoryValue(r).toLowerCase().includes(term)
      );
    }
    return result;
  }, [reports, reportSearch]);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch User profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        setError('User profile not found or database access error.');
        return;
      }
      setUser(profileData);

      // 2. Fetch tracker profiles and health reports in parallel
      const [trackersRes, reportsRes] = await Promise.all([
        supabase
          .from('tracker_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('health_reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      setTrackers(trackersRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError('An error occurred while retrieving user details.');
    } finally {
      setLoading(false);
    }
  };


  const getReportSummaryValue = (report: HealthReport): string => {
    const { calculator_type, result_data } = report;
    if (!result_data) return 'N/A';
    try {
      switch (calculator_type) {
        case 'bmi': 
          return formatBMI(result_data.bmi || 0);
        case 'bmr': 
          return formatKcal(result_data.bmr || 0);
        case 'calorie': 
          return formatKcal(result_data.maintenance || 0);
        case 'ideal_weight': 
          return result_data.range ? formatRange(result_data.range.min, result_data.range.max, 'kg') : 'N/A';
        case 'water_intake': 
          return formatWater(result_data.waterIntake || 0);
        default: 
          return 'N/A';
      }
    } catch (e) {
      return 'Error';
    }
  };

  const getReportCategoryValue = (report: HealthReport): string => {
    const { calculator_type, result_data } = report;
    if (!result_data) return 'N/A';
    if (calculator_type === 'bmi') {
      return result_data.category || 'Unknown';
    }
    return 'N/A';
  };

  // CSV Export Logic
  const handleExportCSV = () => {
    if (!user) return;

    // Log export action
    logActivity(
      'Admin Export',
      'user',
      user.id,
      `Exported CSV records for user: ${user.full_name || user.email} (${user.id})`
    );

    const headers = [
      "Report ID", 
      "Date Generated", 
      "Calculator Type", 
      "Result Key", 
      "Result Value", 
      "BMI Category"
    ];

    const rows = reports.map(r => {
      let resultVal = getReportSummaryValue(r);
      let category = getReportCategoryValue(r);
      let typeLabel = r.calculator_type.replace('_', ' ');

      return [
        r.id,
        new Date(r.created_at).toLocaleString(),
        typeLabel,
        r.calculator_type === 'bmi' ? 'BMI Score' : r.calculator_type === 'bmr' ? 'BMR Calories' : r.calculator_type === 'calorie' ? 'Daily Allowance' : r.calculator_type === 'ideal_weight' ? 'Weight Range' : 'Water Intake',
        resultVal,
        category
      ];
    });

    const userInfo = [
      ["User Account Information"],
      ["User ID", user.id],
      ["Full Name", user.full_name || "Anonymous"],
      ["Email", user.email],
      ["Authentication Provider", user.provider || "Email/Password"],
      ["Account Privilege Role", user.role],
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
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-ink opacity-20" />
        <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest mt-4">Loading User Details...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-ink mb-2">User Not Found</h2>
          <p className="text-sm text-mute font-medium leading-relaxed">{error || "The requested user account directory was not found in the registry."}</p>
        </div>
        <a 
          href="/admin/users"
          className="h-12 px-6 bg-ink text-canvas rounded-pill font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </a>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const lastReportGenerated = reports.length > 0 ? reports[0].created_at : null;

  return (
    <div className="space-y-12">
      {/* Header Back Button */}
      <div className="flex items-center justify-between">
        <a 
          href="/admin/users"
          className="inline-flex items-center gap-3 text-mute hover:text-ink transition-colors group"
        >
          <div className="w-9 h-9 rounded-full bg-canvas border border-hairline flex items-center justify-center group-hover:-translate-x-1 transition-transform shadow-premium-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Directory</span>
        </a>

        <button 
          onClick={handleExportCSV}
          className="h-12 px-6 bg-canvas border border-hairline text-ink rounded-pill font-black text-[10px] uppercase tracking-widest hover:bg-canvas-soft active:scale-95 transition-all flex items-center gap-2.5 shadow-premium-sm"
        >
          <Download className="w-4 h-4" />
          Export User Data
        </button>
      </div>

      {/* Main User Identity Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Card: Identity */}
        <div className="lg:col-span-1 bg-ink text-canvas rounded-[2.5rem] p-8 sm:p-10 shadow-premium-2xl relative overflow-hidden group">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-4xl shadow-inner uppercase">
               {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tighter truncate max-w-[220px]">{user.full_name || 'Anonymous User'}</h3>
              <div className="flex items-center justify-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-[9px] font-mono font-black uppercase tracking-widest text-status-healthy">
                  Active Member
                </span>
              </div>
            </div>

            <div className="w-full pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Account ID</span>
                <span className="text-[10px] font-mono font-bold truncate max-w-[120px]">{user.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Privilege</span>
                <span className="text-[10px] font-black uppercase tracking-tighter capitalize">{user.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Source</span>
                <span className="text-[10px] font-black uppercase tracking-tighter capitalize">{user.provider || 'Email/Password'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Info: Core Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health Stats */}
          <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 shadow-premium-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-mute opacity-60" />
                <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.25em]">Health Data Metrics</h4>
              </div>
              <p className="text-xs text-mute font-medium leading-normal">Operational stats for the health tracker dashboard.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-canvas-soft border border-hairline rounded-[1.75rem] space-y-1">
                <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest opacity-40">BMI Reports</span>
                <p className="text-3xl font-black text-ink">{reports.filter(r => r.calculator_type === 'bmi').length}</p>
              </div>
              <div className="p-5 bg-canvas-soft border border-hairline rounded-[1.75rem] space-y-1">
                <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest opacity-40">Total Profiles</span>
                <p className="text-3xl font-black text-ink">{trackers.length}</p>
              </div>
            </div>
          </div>

          {/* Activity Registry */}
          <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 shadow-premium-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-mute opacity-60" />
                <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.25em]">Activity Registry</h4>
              </div>
              <p className="text-xs text-mute font-medium leading-normal">System audit trail and session signatures.</p>
            </div>

            <div className="space-y-4 font-bold">
              <div className="flex items-center justify-between py-2 border-b border-hairline">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Last Login Signature</span>
                <span className="text-[10px] text-ink">{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-hairline">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Last Report Generated</span>
                <span className="text-[10px] text-ink">{lastReportGenerated ? new Date(lastReportGenerated).toLocaleDateString() : 'Never'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Registration Date</span>
                <span className="text-[10px] text-ink">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tracker Profiles List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-ink" />
            <h3 className="text-lg font-black tracking-tight text-ink">Managed Tracker Profiles</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-canvas border border-hairline text-[9px] font-mono font-black text-mute">{trackers.length} profiles</span>
        </div>

        {trackers.length === 0 ? (
          <div className="p-12 border border-dashed border-hairline rounded-[2rem] bg-canvas text-center">
            <p className="text-xs font-mono font-bold text-mute uppercase tracking-widest opacity-50">No profiles created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trackers.map((t) => (
              <div key={t.id} className="p-6 bg-canvas border border-hairline rounded-[2rem] flex items-center justify-between hover:shadow-premium-md transition-all duration-300">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center font-black text-xs text-ink uppercase shrink-0">
                    {(t.nickname || t.profile_name).charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-ink tracking-tight truncate">{t.nickname || t.profile_name}</span>
                    <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-40">Created {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <span className="px-2.5 py-1 rounded-pill bg-ink/5 border border-ink/10 text-[9px] font-black uppercase tracking-widest text-mute shrink-0">
                  {t.relation_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Health Reports History Table */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-ink" />
            <h3 className="text-lg font-black tracking-tight text-ink">Health Report History</h3>
          </div>

          <div className="relative group w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mute opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={reportSearch}
              onChange={(e) => {
                setReportSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 pl-11 pr-4 bg-canvas border border-hairline rounded-pill text-[11px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all shadow-premium-sm"
            />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-soft border-b border-hairline">
                  <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Date</th>
                  <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Calculator Type</th>
                  <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Result Value</th>
                  <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em]">Category</th>
                  <th className="py-5 px-8 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Search className="w-10 h-10 text-mute" />
                        <p className="text-[10px] font-mono font-black uppercase tracking-widest text-mute">No matching health reports</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-canvas-soft/40 transition-colors group">
                      <td className="py-5 px-8 text-[11px] font-mono font-bold text-mute opacity-80">
                        {new Date(report.created_at).toLocaleString()}
                      </td>
                      <td className="py-5 px-8 font-black text-ink text-xs uppercase tracking-wider">
                        {report.calculator_type.replace('_', ' ')}
                      </td>
                      <td className="py-5 px-8 text-xs font-mono font-bold text-ink">
                        {getReportSummaryValue(report)}
                      </td>
                      <td className="py-5 px-8 text-xs font-bold text-ink">
                        {getReportCategoryValue(report) !== 'N/A' ? (
                          <span className="px-2.5 py-1 rounded-pill bg-ink/5 border border-ink/10 text-[9px] font-black uppercase tracking-widest text-mute">
                            {getReportCategoryValue(report)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-mute opacity-30">N/A</span>
                        )}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex items-center justify-end">
                          <span className="text-[8px] font-mono font-black uppercase tracking-widest text-mute opacity-0 group-hover:opacity-65 transition-opacity mr-2">Audit Registry</span>
                          <button
                            onClick={() => window.location.href = `/admin/audit-logs?reportId=${report.id}`}
                            className="w-8 h-8 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors shadow-premium-sm hover:bg-canvas-soft active:scale-95 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="py-4 px-8 bg-canvas-soft border-t border-hairline flex items-center justify-between">
              <p className="text-[9px] font-mono font-black text-mute uppercase tracking-widest opacity-40">
                {filteredReports.length} reports total — Page {page}/{totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-[9px] font-black uppercase tracking-widest text-mute hover:text-ink disabled:opacity-20 transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-[9px] font-black uppercase tracking-widest text-mute hover:text-ink disabled:opacity-20 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
