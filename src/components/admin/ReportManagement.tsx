import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, 
  Search, 
  Loader2, 
  Activity, 
  Download, 
  Calendar, 
  User as UserIcon, 
  TrendingUp, 
  Plus, 
  Filter, 
  Check, 
  ExternalLink, 
  MoreVertical, 
  Trash2,
  ChevronRight,
  TrendingDown,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  formatBMI, 
  formatKcal, 
  formatWater, 
  formatRange 
} from '../../lib/format';
import { logActivity } from '../../lib/audit';

export const getBMICategory = (bmi: number): string => {
  if (!bmi || bmi <= 0) return '';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal Weight';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obesity Class I';
  if (bmi < 40) return 'Obesity Class II';
  return 'Obesity Class III';
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

interface HealthReport {
  id: string;
  calculator_type: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake' | 'body_fat' | 'lean_body_mass' | 'protein_intake' | 'macro' | 'daily_nutrition';
  input_data: any;
  result_data: any;
  created_at: string;
  user_id: string;
  tracker_profile_id: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  tracker_profiles?: {
    id: string;
    profile_name: string;
    relation_type: string;
  } | null;
}

const loggedOrphans = new Set<string>();

export const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'bmi' | 'bmr' | 'calorie' | 'water_intake' | 'ideal_weight' | 'body_fat' | 'lean_body_mass' | 'protein_intake' | 'macro' | 'daily_nutrition'>('all');
  const [bmiFilter, setBmiFilter] = useState<'all' | 'Underweight' | 'Normal' | 'Overweight' | 'Obese'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleteReportType, setDeleteReportType] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Dashboard overall metrics state
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisMonth: 0,
    activeUsers: 0,
    avgBmi: 0
  });

  // BMI distribution metrics state
  const [distribution, setDistribution] = useState({
    underweight: 0,
    normal: 0,
    overweight: 0,
    obese: 0
  });

  const bmiTotal = distribution.underweight + distribution.normal + distribution.overweight + distribution.obese;

  const itemsPerPage = 10;

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  // Re-fetch reports whenever filters or page changes
  useEffect(() => {
    if (isAdmin) {
      fetchReportsData();
    }
  }, [isAdmin, page, search, reportTypeFilter, bmiFilter, dateFilter]);

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

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Parallel fetching counts
      const [totalRes, todayRes, monthRes, activeRes, bmiReportsRes] = await Promise.all([
        supabase.from('health_reports').select('id', { count: 'exact', head: true }),
        supabase.from('health_reports').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday),
        supabase.from('health_reports').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
        supabase.rpc('get_active_users_count', { days_offset: 30 }),
        supabase.from('health_reports').select('result_data').eq('calculator_type', 'bmi')
      ]);

      // Calculate BMI specific metrics
      const bmis = (bmiReportsRes.data || []).map((r: any) => {
        const resData = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : r.result_data;
        return resData?.bmi;
      }).filter(Boolean);
      const avgBmi = bmis.length > 0 ? bmis.reduce((a, b) => a + b, 0) / bmis.length : 0;

      const dist = {
        underweight: bmis.filter((bmi: number) => getBMICategory(bmi) === 'Underweight').length,
        normal: bmis.filter((bmi: number) => getBMICategory(bmi) === 'Normal Weight').length,
        overweight: bmis.filter((bmi: number) => getBMICategory(bmi) === 'Overweight').length,
        obese: bmis.filter((bmi: number) => getBMICategory(bmi).startsWith('Obesity')).length,
      };

      const activeUsersCount = Number(activeRes.data) || 0;

      setStats({
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        thisMonth: monthRes.count || 0,
        activeUsers: activeUsersCount,
        avgBmi: avgBmi
      });

      setDistribution(dist);
    } catch (e) {
      console.error('Error compiling reports metrics:', e);
    }
  };

  const buildBaseQuery = async (all = false) => {
    let query = supabase
      .from('health_reports')
      .select(`
        id,
        calculator_type,
        input_data,
        result_data,
        created_at,
        user_id,
        tracker_profile_id,
        tracker_profiles:tracker_profile_id (id, profile_name, relation_type)
      `, { count: 'exact' });

    // Handle search filter (two-step lookup for stability and indexing)
    if (search.trim()) {
      const term = search.trim();
      const [matchedProfiles, matchedTrackers] = await Promise.all([
        supabase.from('profiles').select('id').or(`email.ilike.%${term}%,full_name.ilike.%${term}%`),
        supabase.from('tracker_profiles').select('id').ilike('profile_name', `%${term}%`)
      ]);

      const profileIds = (matchedProfiles?.data || []).map(p => p.id);
      const trackerIds = (matchedTrackers?.data || []).map(t => t.id);

      // If search query exists but matches nothing in either table, query must yield 0 records
      if (profileIds.length === 0 && trackerIds.length === 0) {
        return { query: null, count: 0 };
      }

      const orConditions = [];
      if (profileIds.length > 0) {
        orConditions.push(`user_id.in.(${profileIds.join(',')})`);
      }
      if (trackerIds.length > 0) {
        orConditions.push(`tracker_profile_id.in.(${trackerIds.join(',')})`);
      }
      query = query.or(orConditions.join(','));
    }

    // Apply calculator type filter
    if (reportTypeFilter !== 'all') {
      query = query.eq('calculator_type', reportTypeFilter);
    }

    // Apply BMI category filter (forces calculator_type to 'bmi')
    if (bmiFilter !== 'all') {
      query = query.eq('calculator_type', 'bmi');
      if (bmiFilter === 'Underweight') {
        query = query.lt('result_data->bmi', 18.5);
      } else if (bmiFilter === 'Normal') {
        query = query.gte('result_data->bmi', 18.5).lt('result_data->bmi', 25);
      } else if (bmiFilter === 'Overweight') {
        query = query.gte('result_data->bmi', 25).lt('result_data->bmi', 30);
      } else if (bmiFilter === 'Obese') {
        query = query.gte('result_data->bmi', 30);
      }
    }

    // Apply Date Range filter
    if (dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', startOfToday);
      } else if (dateFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      } else if (dateFilter === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
      }
    }

    // Sort order
    query = query.order('created_at', { ascending: false });

    // Pagination
    if (!all) {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
    }

    return { query, count: null };
  };

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const { query, count } = await buildBaseQuery(false);
      
      if (query === null) {
        setReports([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const { data, count: exactCount, error } = await query;
      if (error) throw error;

      const healthReports = (data as unknown as HealthReport[]) || [];

      // Fetch profiles separately to bypass relationship resolution error
      const userIds = Array.from(new Set(healthReports.map(r => r.user_id).filter(Boolean)));
      let profilesMap: Record<string, { id: string; email: string; full_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
          
        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.id] = p;
          });
        }
      }
      
      // Map profiles back to healthReports
      const reportsWithProfiles = healthReports.map(r => {
        const profile = profilesMap[r.user_id] || null;
        if (r.user_id && !profile) {
          if (!loggedOrphans.has(r.user_id)) {
            loggedOrphans.add(r.user_id);
            logActivity(
              'ORPHAN_PROFILE_DETECTED',
              'user',
              r.user_id,
              `Orphan profile detected for user ID: ${r.user_id}. Report ID: ${r.id}`,
              { report_id: r.id }
            );
          }
        }
        return {
          ...r,
          profiles: profile
        };
      });

      setReports(reportsWithProfiles);
      setTotalCount(exactCount || 0);
    } catch (err) {
      console.error('Failed to load health reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const getReportSummaryValue = (report: HealthReport): string => {
    const { calculator_type, result_data } = report;
    if (!result_data) return 'N/A';
    const resData = typeof result_data === 'string' ? JSON.parse(result_data) : result_data;
    try {
      switch (calculator_type) {
        case 'bmi': 
          return formatBMI(resData.bmi || 0);
        case 'bmr': 
          return formatKcal(resData.bmr || 0);
        case 'calorie': 
          return formatKcal(resData.maintenance || 0);
        case 'ideal_weight': 
          return resData.range ? formatRange(resData.range.min, resData.range.max, 'kg') : 'N/A';
        case 'water_intake': 
          return formatWater(resData.waterIntake || 0);
        case 'body_fat': 
          return `${Number(resData.bodyFat || 0).toFixed(1)}%`;
        case 'lean_body_mass': 
          return `${Number(resData.leanMass || 0).toFixed(1)} ${getWeightUnit(report)}`;
        case 'protein_intake': 
          return `${Math.round(resData.proteinGoal || 0)} g/day`;
        case 'macro': 
          return `${Math.round(resData.carbsGrams || 0)}g / ${Math.round(resData.proteinGrams || 0)}g / ${Math.round(resData.fatGrams || 0)}g`;
        case 'daily_nutrition': 
          return `${Math.round(resData.targetCalories || 0)} kcal/day`;
        default: 
          return 'N/A';
      }
    } catch (e) {
      return 'Error';
    }
  };

  const getWeightUnit = (report: HealthReport): string => {
    const system = report.input_data?.system;
    if (system === 'metric') return 'kg';
    if (system === 'us') return 'lb';
    return report.input_data?.weightUnitOther || 'kg';
  };

  const formatHeight = (report: HealthReport): string => {
    const data = report.input_data;
    if (!data) return '—';
    if (data.height) {
      return `${data.height} cm`;
    }
    if (data.feet !== undefined || data.inches !== undefined) {
      return `${data.feet || 0} ft ${data.inches || 0} in`;
    }
    return '—';
  };

  const getReportCategoryValue = (report: HealthReport): string => {
    const { calculator_type, result_data } = report;
    if (!result_data) return '';
    const resData = typeof result_data === 'string' ? JSON.parse(result_data) : result_data;
    switch (calculator_type) {
      case 'bmi':
        return getBMICategory(resData.bmi || 0);
      case 'bmr':
        return 'BMR';
      case 'calorie':
        return 'Daily Calories';
      case 'water_intake':
        return 'Water Intake';
      case 'ideal_weight':
        return 'Ideal Weight';
      case 'body_fat':
        return 'Body Fat';
      case 'lean_body_mass':
        return 'Lean Mass';
      case 'protein_intake':
        return 'Protein Intake';
      case 'macro':
        return 'Macronutrients';
      case 'daily_nutrition':
        return 'Daily Nutrition';
      default:
        return '';
    }
  };

  const handleViewDetails = (reportId: string) => {
    console.log("Navigating to", reportId);
    window.location.assign(`/admin/reports/${reportId}`);
  };

  const handleDeleteReport = async () => {
    if (!deleteReportId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('health_reports')
        .delete()
        .eq('id', deleteReportId);

      if (error) throw error;

      await logActivity(
        'Report Deleted',
        'health_report',
        deleteReportId,
        `Admin deleted health report (${deleteReportType})`
      );

      await fetchStats();

      const updatedReports = reports.filter(r => r.id !== deleteReportId);
      if (updatedReports.length === 0 && page > 1) {
        setPage(p => p - 1);
      } else {
        await fetchReportsData();
      }

      setToast({ message: 'Report deleted successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to delete report:', err);
      setToast({ message: 'Failed to delete report', type: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteReportId(null);
      setDeleteReportType('');
    }
  };

  // CSV Export for a single report row
  const handleExportSingleReport = (report: HealthReport) => {
    try {
      // Log export action
      logActivity(
        'Report Export',
        'health_report',
        report.id,
        `Exported CSV for report ID: ${report.id} (${report.calculator_type})`
      );

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
    } catch (e) {
      console.error('Single CSV generation failed:', e);
      alert('Could not export report details.');
    }
  };

  // CSV Export for all filtered reports matching active queries
  const handleExportFilteredReports = async () => {
    try {
      // Log export action
      logActivity(
        'Admin Export',
        'health_report',
        null,
        `Exported bulk filtered health reports CSV`
      );

      const { query } = await buildBaseQuery(true);
      if (query === null) {
        alert('No matching records found to export.');
        return;
      }

      const { data: allMatchedReports, error } = await query.limit(1001);
      if (error) throw error;

      if (!allMatchedReports || allMatchedReports.length === 0) {
        alert('No matching records found to export.');
        return;
      }

      const hasExcess = allMatchedReports.length > 1000;
      const recordsToProcess = hasExcess ? allMatchedReports.slice(0, 1000) : allMatchedReports;

      if (hasExcess) {
        setToast({ 
          message: 'Export capped at 1,000 recent records to prevent browser crash', 
          type: 'error' 
        });
      }

      // Fetch profiles separately to bypass relationship resolution error
      const userIds = Array.from(new Set(recordsToProcess.map((r: any) => r.user_id).filter(Boolean)));
      let profilesMap: Record<string, { id: string; email: string; full_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
          
        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.id] = p;
          });
        }
      }

      const reportsWithProfiles = recordsToProcess.map((r: any) => ({
        ...r,
        profiles: profilesMap[r.user_id] || null
      }));

      const headers = [
        "Report ID",
        "Date Generated",
        "Calculator Type",
        "User Full Name",
        "User Email",
        "Tracker Profile",
        "Relation",
        "Age Input",
        "Height Input",
        "Weight Input",
        "BMI Score",
        "Category Status",
        "Calculation Outcome Summary"
      ];

      const rows = reportsWithProfiles.map((r: any) => {
        const input = r.input_data || {};
        const result = r.result_data || {};
        
        let valSummary = '';
        if (r.calculator_type === 'bmi') valSummary = result.bmi ? formatBMI(result.bmi) : '';
        else if (r.calculator_type === 'bmr') valSummary = result.bmr ? formatKcal(result.bmr) : '';
        else if (r.calculator_type === 'calorie') valSummary = result.maintenance ? formatKcal(result.maintenance) : '';
        else if (r.calculator_type === 'ideal_weight') valSummary = result.range ? formatRange(result.range.min, result.range.max, 'kg') : '';
        else if (r.calculator_type === 'water_intake') valSummary = result.waterIntake ? formatWater(result.waterIntake) : '';
        else if (r.calculator_type === 'body_fat') valSummary = result.bodyFat ? `${Number(result.bodyFat).toFixed(1)}%` : '';
        else if (r.calculator_type === 'lean_body_mass') valSummary = result.leanMass ? `${Number(result.leanMass).toFixed(1)}` : '';
        else if (r.calculator_type === 'protein_intake') valSummary = result.proteinGoal ? `${Math.round(result.proteinGoal)}g` : '';
        else if (r.calculator_type === 'macro') valSummary = result.proteinGrams ? `${Math.round(result.carbsGrams)}c / ${Math.round(result.proteinGrams)}p / ${Math.round(result.fatGrams)}f` : '';
        else if (r.calculator_type === 'daily_nutrition') valSummary = result.targetCalories ? `${Math.round(result.targetCalories)} kcal` : '';

        let heightStr = '—';
        if (input.height) {
          heightStr = `${input.height} cm`;
        } else if (input.feet !== undefined || input.inches !== undefined) {
          heightStr = `${input.feet || 0} ft ${input.inches || 0} in`;
        }

        let weightStr = '—';
        if (input.weight) {
          const wSys = input.system;
          const wUnit = wSys === 'metric' ? 'kg' : (wSys === 'us' ? 'lb' : (input.weightUnitOther || 'kg'));
          weightStr = `${input.weight} ${wUnit}`;
        }

        return [
          r.id,
          new Date(r.created_at).toLocaleString(),
          r.calculator_type.replace('_', ' ').toUpperCase(),
          r.profiles?.full_name || "Anonymous",
          r.profiles?.email || "N/A",
          r.tracker_profiles?.profile_name || "Self",
          r.tracker_profiles?.relation_type || "self",
          input.age || '—',
          heightStr,
          weightStr,
          r.calculator_type === 'bmi' ? (result.bmi || '—') : '—',
          r.calculator_type === 'bmi' ? getBMICategory(result.bmi || 0) : '—',
          valSummary
        ];
      });

      const csvContent = [headers, ...rows].map(e => e.map(val => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `filtered_health_reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Bulk CSV export failed:', e);
      alert('Could not export matching reports.');
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!isAdmin) return null;

  return (
    <div className="space-y-10">
      
      {/* Header & Title Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">Reports Log</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-ink/5 border border-ink/10">
              <Activity className="w-3 h-3 text-mute" />
              <span className="text-[9px] font-black text-mute uppercase tracking-tighter">{stats.total} Total Reports</span>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-ink leading-tight">System Reports</h1>
        </div>

        {/* Search & Filter Controls Grid */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full">
          {/* Real-time Search by Name, Email, Profile Name */}
          <div className="relative group w-full xl:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mute opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="Search by name, email, profile..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-12 pl-11 pr-4 bg-canvas border border-hairline rounded-pill text-[12px] font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all shadow-premium-sm"
            />
          </div>

          {/* Action Row Filters */}
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Report Type Filters */}
            <div className="flex items-center bg-canvas border border-hairline rounded-pill p-1.5 shadow-premium-sm overflow-x-auto no-scrollbar">
              {(['all', 'bmi', 'bmr', 'calorie', 'water_intake', 'ideal_weight', 'body_fat', 'lean_body_mass', 'protein_intake', 'macro', 'daily_nutrition'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { 
                    setReportTypeFilter(type); 
                    if (type !== 'bmi') setBmiFilter('all'); // disable BMI filter when other type is clicked
                    setPage(1); 
                  }}
                  className={`px-4 py-2.5 rounded-pill text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    reportTypeFilter === type ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink'
                  }`}
                >
                  {type === 'all' ? 'All Types' : type === 'bmi' ? 'BMI' : type === 'bmr' ? 'BMR' : type === 'calorie' ? 'Calorie' : type === 'water_intake' ? 'Water' : type === 'ideal_weight' ? 'Ideal Weight' : type === 'body_fat' ? 'Body Fat' : type === 'lean_body_mass' ? 'Lean Mass' : type === 'protein_intake' ? 'Protein' : type === 'macro' ? 'Macros' : 'Nutrition'}
                </button>
              ))}
            </div>

            {/* Date Filters */}
            <div className="flex items-center bg-canvas border border-hairline rounded-pill p-1.5 shadow-premium-sm">
              {(['all', 'today', '7days', '30days'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => { setDateFilter(d); setPage(1); }}
                  className={`px-4 py-2.5 rounded-pill text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    dateFilter === d ? 'bg-ink text-canvas shadow-premium-md' : 'text-mute hover:text-ink'
                  }`}
                >
                  {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === '7days' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>

            {/* Export Filtered CSV Button */}
            <button
              onClick={handleExportFilteredReports}
              className="h-12 px-6 bg-canvas border border-hairline text-ink rounded-pill font-black text-[10px] uppercase tracking-widest hover:bg-canvas-soft active:scale-95 transition-all flex items-center gap-2 shadow-premium-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export Filtered
            </button>
          </div>
        </div>

        {/* BMI Specific Secondary Filters (Triggered automatically) */}
        {(reportTypeFilter === 'all' || reportTypeFilter === 'bmi') && (
          <div className="flex items-center gap-3 bg-canvas-soft border border-hairline rounded-3xl p-3 w-fit shadow-premium-sm">
            <span className="text-[9px] font-mono font-black text-mute uppercase tracking-widest ml-3 mr-1">BMI Categories:</span>
            <div className="flex items-center gap-1">
              {(['all', 'Underweight', 'Normal', 'Overweight', 'Obese'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { 
                    setBmiFilter(cat); 
                    if (cat !== 'all') setReportTypeFilter('bmi'); // force report type to BMI
                    setPage(1); 
                  }}
                  className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    bmiFilter === cat ? 'bg-ink text-canvas shadow-premium-sm' : 'text-mute hover:text-ink bg-canvas border border-hairline'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Total Reports</span>
            <p className="text-2xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Today's Reports</span>
            <p className="text-2xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.today}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">This Month</span>
            <p className="text-2xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.thisMonth}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Active Users</span>
            <p className="text-2xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.activeUsers}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm hover:shadow-premium-md transition-all flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Average BMI</span>
            <p className="text-2xl font-black text-ink mt-1 group-hover:scale-105 transition-transform origin-left">{stats.avgBmi.toFixed(1)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BMI Distribution Breakdown Analytics */}
      <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 shadow-premium-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.25em]">BMI Category Distribution Breakdown</h4>
            <p className="text-xs text-mute font-medium leading-relaxed">Aggregated weight status classification across the entire platform database.</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/5 border border-blue-500/10">
            <TrendingUp className="w-3 h-3 text-blue-500" />
            <span className="text-[9px] font-mono font-black text-blue-500 uppercase">Live Distribution</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {/* Underweight Card */}
          <div className="p-5 bg-canvas-soft border border-hairline rounded-[1.75rem] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black text-blue-600 uppercase tracking-widest bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded">Underweight</span>
              <span className="text-[10px] font-mono font-bold text-mute">{distribution.underweight} reports</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-ink">
                {bmiTotal > 0 ? (distribution.underweight / bmiTotal * 100).toFixed(1) : '0'}%
              </p>
              <div className="w-full h-1.5 bg-canvas border border-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${bmiTotal > 0 ? (distribution.underweight / bmiTotal * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Normal Card */}
          <div className="p-5 bg-canvas-soft border border-hairline rounded-[1.75rem] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black text-status-healthy uppercase tracking-widest bg-status-healthy/5 border border-status-healthy/10 px-2 py-0.5 rounded">Normal Weight</span>
              <span className="text-[10px] font-mono font-bold text-mute">{distribution.normal} reports</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-ink">
                {bmiTotal > 0 ? (distribution.normal / bmiTotal * 100).toFixed(1) : '0'}%
              </p>
              <div className="w-full h-1.5 bg-canvas border border-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full bg-status-healthy rounded-full transition-all duration-1000"
                  style={{ width: `${bmiTotal > 0 ? (distribution.normal / bmiTotal * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Overweight Card */}
          <div className="p-5 bg-canvas-soft border border-hairline rounded-[1.75rem] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">Overweight</span>
              <span className="text-[10px] font-mono font-bold text-mute">{distribution.overweight} reports</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-ink">
                {bmiTotal > 0 ? (distribution.overweight / bmiTotal * 100).toFixed(1) : '0'}%
              </p>
              <div className="w-full h-1.5 bg-canvas border border-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${bmiTotal > 0 ? (distribution.overweight / bmiTotal * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Obese Card */}
          <div className="p-5 bg-canvas-soft border border-hairline rounded-[1.75rem] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black text-red-600 uppercase tracking-widest bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded">Obese</span>
              <span className="text-[10px] font-mono font-bold text-mute">{distribution.obese} reports</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-ink">
                {bmiTotal > 0 ? (distribution.obese / bmiTotal * 100).toFixed(1) : '0'}%
              </p>
              <div className="w-full h-1.5 bg-canvas border border-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-1000"
                  style={{ width: `${bmiTotal > 0 ? (distribution.obese / bmiTotal * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table Layout */}
      <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-lg relative min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas-soft border-b border-hairline">
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">User</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Profile</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Report Type</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Result Value</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Category/Type</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Age</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Height</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Weight</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em]">Generated Date</th>
                <th className="py-6 px-10 text-[10px] font-mono font-black text-mute uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-24"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-16"></div></td>
                    <td className="py-6 px-10"><div className="h-6 bg-canvas-soft rounded-full w-16"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-10"></div></td>
                    <td className="py-6 px-10"><div className="h-6 bg-canvas-soft rounded-full w-16"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-8"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-12"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-12"></div></td>
                    <td className="py-6 px-10"><div className="h-4 bg-canvas-soft rounded w-20"></div></td>
                    <td className="py-6 px-10 text-right"><div className="h-8 w-8 bg-canvas-soft rounded-full ml-auto"></div></td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Search className="w-12 h-12 text-mute" />
                      <p className="text-xs font-mono font-black uppercase tracking-widest text-mute">No health reports matching filters found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr 
                    key={report.id} 
                    onClick={() => window.location.href = `/admin/reports/${report.id}`}
                    className="hover:bg-canvas-soft/50 transition-colors group cursor-pointer"
                  >
                    {/* User */}
                    <td className="py-6 px-10">
                      <div className="flex flex-col">
                        {report.user_id && !report.profiles ? (
                          <>
                            <span className="font-black text-red-600 text-sm tracking-tight truncate max-w-[140px]">
                              Orphaned User
                            </span>
                            <span className="text-[9px] font-mono font-bold text-red-500 uppercase tracking-widest opacity-60">
                              Profile Missing
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest bg-red-500/5 text-red-600 border border-red-500/10 w-fit mt-1">
                              Orphan
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-black text-ink text-sm tracking-tight truncate max-w-[140px]">
                              {report.profiles?.full_name || 'Anonymous'}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest opacity-60">
                              {report.profiles?.email || 'N/A'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Profile */}
                    <td className="py-6 px-10">
                      <div className="flex flex-col">
                        <span className="font-bold text-ink text-xs truncate max-w-[100px]">
                          {report.tracker_profiles?.profile_name || 'Self'}
                        </span>
                        <span className="text-[9px] font-mono text-mute uppercase tracking-widest opacity-60">
                          {report.tracker_profiles?.relation_type || 'self'}
                        </span>
                      </div>
                    </td>

                    {/* Report Type */}
                    <td className="py-6 px-10">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-pill text-[9px] font-black uppercase tracking-widest border bg-ink/5 text-ink border-ink/10">
                        {report.calculator_type.replace('_', ' ')}
                      </div>
                    </td>

                    {/* Result Value */}
                    <td className="py-6 px-10 text-xs font-mono font-bold text-ink">
                      {getReportSummaryValue(report)}
                    </td>

                    {/* Category/Type */}
                    <td className="py-6 px-10">
                      {getReportCategoryValue(report) ? (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          report.calculator_type === 'bmi'
                            ? getReportCategoryValue(report).toLowerCase() === 'normal weight' 
                              ? 'bg-status-healthy/5 text-status-healthy border-status-healthy/10'
                              : getReportCategoryValue(report).toLowerCase() === 'underweight'
                              ? 'bg-blue-500/5 text-blue-600 border-blue-500/10'
                              : getReportCategoryValue(report).toLowerCase() === 'overweight'
                              ? 'bg-amber-500/5 text-amber-600 border-amber-500/10'
                              : 'bg-red-500/5 text-red-600 border-red-500/10'
                            : 'bg-ink/5 text-mute border-ink/10'
                        }`}>
                          {getReportCategoryValue(report)}
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-mute opacity-30">—</span>
                      )}
                    </td>

                    {/* Age */}
                    <td className="py-6 px-10 text-xs font-mono font-bold text-ink">
                      {report.input_data?.age || '—'}
                    </td>

                    {/* Height */}
                    <td className="py-6 px-10 text-xs font-mono font-bold text-ink">
                      {formatHeight(report)}
                    </td>

                    {/* Weight */}
                    <td className="py-6 px-10 text-xs font-mono font-bold text-ink">
                      {report.input_data?.weight ? `${report.input_data.weight} ${getWeightUnit(report)}` : '—'}
                    </td>

                    {/* Date */}
                    <td className="py-6 px-10 text-[10px] font-mono font-bold text-mute opacity-80">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions dropdown button */}
                    <td className="py-6 px-10 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          if (activeDropdown === report.id) {
                            setActiveDropdown(null);
                            setDropdownPosition(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const DROPDOWN_HEIGHT = 200;
                          const DROPDOWN_WIDTH = 192;
                          
                          // Check vertical space (open below by default, open upward if tight)
                          const fitsBelow = rect.bottom + 8 + DROPDOWN_HEIGHT <= window.innerHeight;
                          const top = fitsBelow ? rect.bottom + 8 : Math.max(8, rect.top - DROPDOWN_HEIGHT - 8);
                          
                          // Check horizontal space (align right by default, align left if tight)
                          const fitsRight = rect.right - DROPDOWN_WIDTH >= 8;
                          const left = fitsRight ? rect.right - DROPDOWN_WIDTH : Math.max(8, rect.left);

                          setDropdownPosition({ top, left });
                          setActiveDropdown(report.id);
                        }}
                        className="h-9 w-9 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mute hover:text-ink hover:border-ink hover:bg-canvas-soft transition-all ml-auto relative z-10 active:scale-95"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {activeDropdown === report.id && dropdownPosition && (
                          <div 
                            key={`dropdown-wrapper-${report.id}`} 
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
                                onClick={() => { handleViewDetails(report.id); setActiveDropdown(null); setDropdownPosition(null); }}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink hover:bg-canvas-soft transition-colors text-left"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                View Details
                              </button>
                              
                              <button 
                                onClick={() => { handleExportSingleReport(report); setActiveDropdown(null); setDropdownPosition(null); }}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink hover:bg-canvas-soft transition-colors text-left border-t border-hairline pt-3 mt-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Export CSV
                              </button>

                              <button 
                                onClick={() => {
                                  window.location.href = `/admin/audit-logs?reportId=${report.id}`;
                                  setActiveDropdown(null);
                                  setDropdownPosition(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-mute hover:text-ink hover:bg-canvas-soft transition-colors text-left border-t border-hairline pt-3 mt-1"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                Audit Registry
                              </button>

                              <button 
                                onClick={() => {
                                  setDeleteReportId(report.id);
                                  setDeleteReportType(report.calculator_type.toUpperCase().replace('_', ' '));
                                  setActiveDropdown(null);
                                  setDropdownPosition(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/5 transition-colors text-left border-t border-hairline pt-3 mt-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Report
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

        {/* Dynamic Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="py-6 px-10 bg-canvas-soft border-t border-hairline flex items-center justify-between">
            <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest opacity-40">
              {totalCount} reports matching filters — Page {page}/{totalPages}
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

      {/* Delete Confirmation Modal */}
      {deleteReportId && (
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
                <h3 className="text-2xl font-black tracking-tighter text-ink">Delete Report</h3>
                <p className="text-sm text-mute font-medium">Are you sure you want to delete this</p>
                <p className="text-sm font-black text-ink">{deleteReportType} Report?</p>
                <p className="text-xs text-mute/60 font-mono tracking-tight mt-1">ID: {deleteReportId}</p>
                <p className="text-xs text-red-500 font-bold mt-2">This action cannot be undone.</p>
              </div>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => { setDeleteReportId(null); setDeleteReportType(''); }}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-pill border border-hairline text-ink font-black text-[11px] uppercase tracking-widest hover:bg-canvas-soft transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteReport}
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

      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
