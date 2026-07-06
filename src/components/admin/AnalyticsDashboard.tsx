import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Zap, 
  Loader2, 
  Download, 
  Users, 
  FileText, 
  UserCheck, 
  Globe, 
  Mail, 
  Calendar,
  Activity,
  Award,
  Sparkles,
  RefreshCw,
  Search,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { logActivity } from '../../lib/audit';

// Custom sleek Tooltips for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-canvas/80 backdrop-blur-md border border-hairline rounded-xl p-3 shadow-premium-lg text-left">
        <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black text-ink mt-1">
          {payload[0].value} {payload[0].value === 1 ? 'signup' : 'signups'}
        </p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-canvas/80 backdrop-blur-md border border-hairline rounded-xl p-2.5 shadow-premium-lg text-left">
        <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest">{data.name}</p>
        <p className="text-xs font-black text-ink mt-0.5">
          {data.value} users ({data.percent.toFixed(0)}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomCalculatorTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-canvas/80 backdrop-blur-md border border-hairline rounded-xl p-2.5 shadow-premium-lg text-left">
        <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest">{data.name}</p>
        <p className="text-xs font-black text-ink mt-0.5">
          {data.value} {data.value === 1 ? 'report' : 'reports'} ({data.percent.toFixed(0)}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomCalcTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-canvas/80 backdrop-blur-md border border-hairline rounded-xl p-3 shadow-premium-lg text-left">
        <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest">{data.name}</p>
        <p className="text-sm font-black text-ink mt-1">
          {data.count} {data.count === 1 ? 'report' : 'reports'} ({data.percent.toFixed(0)}%)
        </p>
      </div>
    );
  }
  return null;
};

export const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeUsersSearch, setActiveUsersSearch] = useState('');
  
  // Overall Platform Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    totalProfiles: 0
  });

  // User Growth Analytics State
  const [userGrowth, setUserGrowth] = useState({
    daily: {} as Record<string, number>,
    weekly: {} as Record<string, number>,
    monthly: {} as Record<string, number>,
    growthPercentage30D: 0
  });

  // Report Growth Analytics State
  const [reportGrowth, setReportGrowth] = useState({
    today: 0,
    last7Days: 0,
    last30Days: 0,
    growthPercentage30D: 0,
    growthPercentage7D: 0
  });

  // Authentication Provider Analytics
  const [providers, setProviders] = useState({
    googleCount: 0,
    googlePercent: 0,
    emailCount: 0,
    emailPercent: 0,
    googleGrowth: 0
  });

  // BMI Distribution breakdown
  const [bmiDist, setBmiDist] = useState({
    underweight: 0,
    normal: 0,
    overweight: 0,
    obese: 0,
    totalBmiReports: 0,
    underweightPercent: 0,
    normalPercent: 0,
    overweightPercent: 0,
    obesePercent: 0
  });

  // Calculator usage ranks
  const [calculators, setCalculators] = useState<any[]>([]);

  // Top 10 Active Users Registry
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  // Platform AI Insights
  const [insights, setInsights] = useState<string[]>([]);

  const [activeGrowthTab, setActiveGrowthTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalyticsData();
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    setIsAdmin(true);
    return;
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      
      const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
      const hundredEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();

      // Consolidated RPC call for all dashboard metrics
      const { data: dashboardStats, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
        start_today: startOfToday,
        seven_days: sevenDaysAgo,
        fourteen_days: fourteenDaysAgo,
        thirty_days: thirtyDaysAgo,
        sixty_days: sixtyDaysAgo
      });

      if (rpcError) throw rpcError;

      const totalUsers = dashboardStats.total_users || 0;
      const totalReports = dashboardStats.total_reports || 0;
      const totalProfiles = dashboardStats.total_profiles || 0;
      
      const googleCount = dashboardStats.google_users || 0;
      const emailCount = totalUsers - googleCount;

      const reportsToday = dashboardStats.reports_today || 0;
      const reports7Days = dashboardStats.reports_7days || 0;
      const reports14Days = dashboardStats.reports_14days || 0;
      const reports30Days = dashboardStats.reports_30days || 0;
      const reports60Days = dashboardStats.reports_60days || 0;

      const distUnderweight = dashboardStats.underweight || 0;
      const distNormal = dashboardStats.normal || 0;
      const distOverweight = dashboardStats.overweight || 0;
      const distObese = dashboardStats.obese || 0;
      const totalBmiReports = distUnderweight + distNormal + distOverweight + distObese;

      // 3. User Growth registration dates (fetch only last 180 days created_at to group them)
      const { data: userRegistrationDates } = await supabase
        .from('profiles')
        .select('created_at, provider')
        .gte('created_at', hundredEightyDaysAgo);

      // Perform growth calculations for User Growth
      // Group by daily (last 7 days)
      const dailyRegs: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        dailyRegs[key] = 0;
      }
      
      // Group by weekly (last 4 weeks)
      const weeklyRegs: Record<string, number> = { 'Week 4': 0, 'Week 3': 0, 'Week 2': 0, 'Week 1': 0 };
      
      // Group by monthly (last 6 months)
      const monthlyRegs: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = m.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        monthlyRegs[key] = 0;
      }

      const oneDay = 24 * 60 * 60 * 1000;
      const current30DaysUsers = (userRegistrationDates || []).filter(u => new Date(u.created_at) >= new Date(thirtyDaysAgo)).length;
      const previous30DaysUsers = (userRegistrationDates || []).filter(u => new Date(u.created_at) >= new Date(sixtyDaysAgo) && new Date(u.created_at) < new Date(thirtyDaysAgo)).length;
      const userGrowthPercentage = previous30DaysUsers > 0 ? ((current30DaysUsers - previous30DaysUsers) / previous30DaysUsers) * 100 : 0;

      (userRegistrationDates || []).forEach(u => {
        const uDate = new Date(u.created_at);
        const timeDiff = now.getTime() - uDate.getTime();
        
        // Daily
        if (timeDiff <= 7 * oneDay) {
          const key = uDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          if (key in dailyRegs) dailyRegs[key]++;
        }
        
        // Weekly
        if (timeDiff <= 7 * oneDay) weeklyRegs['Week 1']++;
        else if (timeDiff <= 14 * oneDay) weeklyRegs['Week 2']++;
        else if (timeDiff <= 21 * oneDay) weeklyRegs['Week 3']++;
        else if (timeDiff <= 28 * oneDay) weeklyRegs['Week 4']++;

        // Monthly
        const mKey = uDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        if (mKey in monthlyRegs) monthlyRegs[mKey]++;
      });

      // 4. Report Growth Trends
      const prev30DaysReports = reports60Days - reports30Days;
      const reportGrowthPercentage = prev30DaysReports > 0 ? ((reports30Days - prev30DaysReports) / prev30DaysReports) * 100 : 0;

      const prev7DaysReports = reports14Days - reports7Days;
      const report7DaysPercentage = prev7DaysReports > 0 ? ((reports7Days - prev7DaysReports) / prev7DaysReports) * 100 : 0;

      // 5. Provider Analytics Percentages
      const googlePercent = totalUsers > 0 ? (googleCount / totalUsers) * 100 : 0;
      const emailPercent = totalUsers > 0 ? (emailCount / totalUsers) * 100 : 0;

      // Compare provider growth
      const current30DaysGoogle = (userRegistrationDates || []).filter(u => u.provider === 'google' && new Date(u.created_at) >= new Date(thirtyDaysAgo)).length;
      const previous30DaysGoogle = (userRegistrationDates || []).filter(u => u.provider === 'google' && new Date(u.created_at) >= new Date(sixtyDaysAgo) && new Date(u.created_at) < new Date(thirtyDaysAgo)).length;
      const googleGrowthPercentage = previous30DaysGoogle > 0 ? ((current30DaysGoogle - previous30DaysGoogle) / previous30DaysGoogle) * 100 : 0;

      // 6. Calculator usage ranks
      const calculatorTypes = [
        { type: 'bmi', count: dashboardStats.reports_bmi || 0, name: 'BMI Calculator' },
        { type: 'bmr', count: dashboardStats.reports_bmr || 0, name: 'BMR Calculator' },
        { type: 'calorie', count: dashboardStats.reports_calorie || 0, name: 'Calorie Calculator' },
        { type: 'water_intake', count: dashboardStats.reports_water || 0, name: 'Water Intake' },
        { type: 'ideal_weight', count: dashboardStats.reports_ideal || 0, name: 'Ideal Weight' },
        { type: 'body_fat', count: dashboardStats.reports_body_fat || 0, name: 'Body Fat' },
        { type: 'lean_body_mass', count: dashboardStats.reports_lean_body_mass || 0, name: 'Lean Body Mass' },
        { type: 'protein_intake', count: dashboardStats.reports_protein_intake || 0, name: 'Protein Intake' },
        { type: 'macro', count: dashboardStats.reports_macro || 0, name: 'Macro Split' },
        { type: 'daily_nutrition', count: dashboardStats.reports_daily_nutrition || 0, name: 'Daily Nutrition' },
      ];
      const calculatorRankings = calculatorTypes
        .map(c => ({
          ...c,
          percent: totalReports > 0 ? (c.count / totalReports) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      // 7. Active Users ranking via server-side RPC
      const { data: topActiveUsers, error: activeUsersError } = await supabase.rpc('get_top_active_users');
      if (activeUsersError) throw activeUsersError;

      const activeUsersList = (topActiveUsers || []).map(u => ({
        rank: u.rank,
        id: u.id,
        name: u.name,
        email: u.email,
        reportsCount: u.reports_count,
        profilesCount: u.profiles_count
      }));

      // 8. Generate platform insights
      const primaryCalc = calculatorRankings[0];
      const platformInsights: string[] = [];

      // 1. Primary Calculator Insight
      if (totalReports > 0 && primaryCalc && primaryCalc.count > 0) {
        platformInsights.push(
          `${primaryCalc.percent.toFixed(0)}% of saved reports were generated using the ${primaryCalc.name} (${primaryCalc.count} reports).`
        );
      }

      // 2. Google Auth Insight (only if Google users > 0)
      if (googleCount > 0) {
        if (googleGrowthPercentage !== 0) {
          platformInsights.push(
            `Google registration volume grew by ${googleGrowthPercentage.toFixed(0)}% in the last 30 days, representing ${googlePercent.toFixed(0)}% of total users.`
          );
        } else {
          platformInsights.push(
            `Google Authentication is active, used by ${googleCount} users (${googlePercent.toFixed(0)}% of total users).`
          );
        }
      }

      // 3. BMI Status Distribution Insight (only if BMI reports > 0)
      if (totalBmiReports > 0) {
        const sortedBmiCategories = [
          { label: 'Normal Weight', count: distNormal },
          { label: 'Underweight', count: distUnderweight },
          { label: 'Overweight', count: distOverweight },
          { label: 'Obese', count: distObese },
        ].sort((a, b) => b.count - a.count);

        const topBmi = sortedBmiCategories[0];
        if (topBmi && topBmi.count > 0) {
          const topBmiPercent = (topBmi.count / totalBmiReports) * 100;
          platformInsights.push(
            `BMI Status analysis shows '${topBmi.label}' is the most common classification, representing ${topBmiPercent.toFixed(0)}% of all BMI reports.`
          );
        }
      }

      // 4. Report Generation Velocity Insight
      if (reports30Days > 0) {
        if (reportGrowthPercentage !== 0) {
          platformInsights.push(
            `Monthly health report generation velocity changed by ${reportGrowthPercentage.toFixed(0)}% (with ${reports30Days} reports created in the last 30 days).`
          );
        } else {
          platformInsights.push(
            `Report generation velocity is active with ${reports30Days} reports saved in the last 30 days.`
          );
        }
      }

      if (platformInsights.length === 0) {
        platformInsights.push("Not enough data available to generate insights.");
      }

      setStats({ totalUsers, totalReports, totalProfiles });
      setProviders({
        googleCount,
        googlePercent,
        emailCount,
        emailPercent,
        googleGrowth: googleGrowthPercentage
      });
      setReportGrowth({
        today: reportsToday,
        last7Days: reports7Days,
        last30Days: reports30Days,
        growthPercentage30D: reportGrowthPercentage,
        growthPercentage7D: report7DaysPercentage
      });
      setBmiDist({
        underweight: distUnderweight,
        normal: distNormal,
        overweight: distOverweight,
        obese: distObese,
        totalBmiReports,
        underweightPercent: totalBmiReports > 0 ? (distUnderweight / totalBmiReports) * 100 : 0,
        normalPercent: totalBmiReports > 0 ? (distNormal / totalBmiReports) * 100 : 0,
        overweightPercent: totalBmiReports > 0 ? (distOverweight / totalBmiReports) * 100 : 0,
        obesePercent: totalBmiReports > 0 ? (distObese / totalBmiReports) * 100 : 0,
      });
      setCalculators(calculatorRankings);
      setUserGrowth({
        daily: dailyRegs,
        weekly: weeklyRegs,
        monthly: monthlyRegs,
        growthPercentage30D: userGrowthPercentage
      });
      setActiveUsers(activeUsersList);
      setInsights(platformInsights);
    } catch (err) {
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  // CSV Export for compiling analytics summary reports
  const handleExportCSV = async () => {
    try {
      const dataRows = [
        ["Platform Analytics Summary Report"],
        ["Generated Date", new Date().toLocaleString()],
        [],
        ["CORE METRICS LOG"],
        ["Total Platform Users", stats.totalUsers],
        ["Total Saved Reports", stats.totalReports],
        ["Total Tracker Profiles", stats.totalProfiles],
        [],
        ["USER REGISTRATIONS GROWTH (30 DAYS)"],
        ["Growth rate vs Prev 30 Days", `${userGrowth.growthPercentage30D.toFixed(1)}%`],
        [],
        ["REPORT GENERATION VELOCITY"],
        ["Reports generated today", reportGrowth.today],
        ["Reports last 7 days", reportGrowth.last7Days],
        ["Reports last 30 days", reportGrowth.last30Days],
        ["30 Days Growth percentage", `${reportGrowth.growthPercentage30D.toFixed(1)}%`],
        [],
        ["AUTHENTICATION PROVIDERS BREAKDOWN"],
        ["Google Users Count", providers.googleCount],
        ["Google Users Share", `${providers.googlePercent.toFixed(1)}%`],
        ["Email/Password Users Count", providers.emailCount],
        ["Email/Password Users Share", `${providers.emailPercent.toFixed(1)}%`],
        [],
        ["BMI STATUS DISTRIBUTION BREAKDOWN"],
        ["Underweight Count", bmiDist.underweight],
        ["Underweight Percent", `${bmiDist.underweightPercent.toFixed(1)}%`],
        ["Normal Weight Count", bmiDist.normal],
        ["Normal Weight Percent", `${bmiDist.normalPercent.toFixed(1)}%`],
        ["Overweight Count", bmiDist.overweight],
        ["Overweight Percent", `${bmiDist.overweightPercent.toFixed(1)}%`],
        ["Obese Count", bmiDist.obese],
        ["Obese Percent", `${bmiDist.obesePercent.toFixed(1)}%`],
        [],
        ["CALCULATOR USAGE RANKINGS"],
        ["Calculator", "Usage Count", "Usage Percent"],
        ...calculators.map(c => [c.name, c.count, `${c.percent.toFixed(1)}%`]),
        [],
        ["TOP 10 ACTIVE USERS REGISTRY"],
        ["Rank", "Email", "Full Name", "Reports Count", "Profiles Created"],
        ...activeUsers.map(u => [u.rank, u.email, u.name, u.reportsCount, u.profilesCount])
      ];

      const csvContent = dataRows.map(e => e.map(val => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `platform_analytics_summary_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log analytics export
      try {
        await logActivity('Analytics Export', 'analytics', null, `Platform analytics exported as CSV`);
      } catch (logErr) {
        console.error('Failed to log analytics export:', logErr);
      }
    } catch (e) {
      console.error('Analytics CSV compile failed:', e);
      alert('Failed to generate analytics CSV.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-ink opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />
        </div>
        <p className="mt-6 text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em] animate-pulse">Compiling Platform Intelligence</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  // Set charts max height values for growth graphs
  const growthData = activeGrowthTab === 'daily' 
    ? userGrowth.daily 
    : activeGrowthTab === 'weekly' 
    ? userGrowth.weekly 
    : userGrowth.monthly;

  const maxGrowthValue = Math.max(...Object.values(growthData || {}), 1);

  const growthDataArray = Object.entries(growthData || {}).map(([key, val]) => ({
    name: key,
    value: val
  }));

  const hasGrowthData = Object.values(growthData || {}).some(v => v > 0);

  const activeTotalUsers = stats.totalUsers;

  const providersData = [
    { name: 'Google SSO', value: providers.googleCount, percent: providers.googlePercent, color: '#3b82f6' },
    { name: 'Email/Password', value: providers.emailCount, percent: providers.emailPercent, color: 'var(--color-ink)' }
  ];

  const hasProvidersData = true;

  const calculatorData = [
    { name: 'BMI Calculator', type: 'bmi', value: calculators.find(c => c.type === 'bmi')?.count || 0, percent: calculators.find(c => c.type === 'bmi')?.percent || 0, color: '#10b981' },
    { name: 'BMR Calculator', type: 'bmr', value: calculators.find(c => c.type === 'bmr')?.count || 0, percent: calculators.find(c => c.type === 'bmr')?.percent || 0, color: '#3b82f6' },
    { name: 'Calorie Calculator', type: 'calorie', value: calculators.find(c => c.type === 'calorie')?.count || 0, percent: calculators.find(c => c.type === 'calorie')?.percent || 0, color: '#f97316' },
    { name: 'Water Intake', type: 'water_intake', value: calculators.find(c => c.type === 'water_intake')?.count || 0, percent: calculators.find(c => c.type === 'water_intake')?.percent || 0, color: '#06b6d4' },
    { name: 'Ideal Weight', type: 'ideal_weight', value: calculators.find(c => c.type === 'ideal_weight')?.count || 0, percent: calculators.find(c => c.type === 'ideal_weight')?.percent || 0, color: '#a855f7' },
    { name: 'Body Fat', type: 'body_fat', value: calculators.find(c => c.type === 'body_fat')?.count || 0, percent: calculators.find(c => c.type === 'body_fat')?.percent || 0, color: '#ec4899' },
    { name: 'Lean Mass', type: 'lean_body_mass', value: calculators.find(c => c.type === 'lean_body_mass')?.count || 0, percent: calculators.find(c => c.type === 'lean_body_mass')?.percent || 0, color: '#14b8a6' },
    { name: 'Protein', type: 'protein_intake', value: calculators.find(c => c.type === 'protein_intake')?.count || 0, percent: calculators.find(c => c.type === 'protein_intake')?.percent || 0, color: '#6366f1' },
    { name: 'Macros', type: 'macro', value: calculators.find(c => c.type === 'macro')?.count || 0, percent: calculators.find(c => c.type === 'macro')?.percent || 0, color: '#eab308' },
    { name: 'Nutrition', type: 'daily_nutrition', value: calculators.find(c => c.type === 'daily_nutrition')?.count || 0, percent: calculators.find(c => c.type === 'daily_nutrition')?.percent || 0, color: '#f43f5e' }
  ];

  const calculatorColors: Record<string, string> = {
    bmi: '#10b981',           // Emerald
    bmr: '#3b82f6',           // Blue
    calorie: '#f97316',       // Orange
    water_intake: '#06b6d4',  // Cyan
    ideal_weight: '#a855f7',  // Purple
    body_fat: '#ec4899',      // Pink
    lean_body_mass: '#14b8a6',// Teal
    protein_intake: '#6366f1',// Indigo
    macro: '#eab308',         // Yellow
    daily_nutrition: '#f43f5e'// Rose
  };

  const hasCalculatorsData = calculators.some(c => c.count > 0);

  return (
    <div className="space-y-10">
      
      {/* Analytics Engine Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-hairline">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">Advanced Insights</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-status-healthy/10 border border-status-healthy/20">
              <Zap className="w-3 h-3 text-status-healthy" />
              <span className="text-[9px] font-black text-status-healthy uppercase tracking-tighter">Engine Operational</span>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-ink leading-[0.9]">
              Insight Engine
            </h1>
            <p className="text-sm text-mute font-medium max-w-xl opacity-60">Visualizing user behaviors, growth trajectory, and platform operations.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchAnalyticsData}
            className="h-12 px-6 rounded-pill bg-canvas border border-hairline text-ink font-black text-[11px] uppercase tracking-widest hover:bg-canvas-soft transition-all shadow-premium-sm flex items-center gap-3 active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-mute" />
            Synchronize
          </button>

          <button 
            onClick={handleExportCSV}
            className="h-12 px-6 rounded-pill bg-ink text-canvas font-black text-[11px] uppercase tracking-widest hover:shadow-premium-lg transition-all active:scale-95 flex items-center gap-3"
          >
            <Download className="w-4 h-4 text-canvas" />
            Export CSV
          </button>
        </div>
      </header>

      {/* Stats Quick Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Total Users</span>
            <p className="text-3xl font-black text-ink mt-1">{stats.totalUsers}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Total Reports</span>
            <p className="text-3xl font-black text-ink mt-1">{stats.totalReports}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">Tracker Profiles</span>
            <p className="text-3xl font-black text-ink mt-1">{stats.totalProfiles}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-canvas-soft border border-hairline flex items-center justify-center text-mute">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2rem] p-6 shadow-premium-sm flex items-center justify-between group">
          <div>
            <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-[0.2em] opacity-60">User growth (30d)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-ink">
                {userGrowth.growthPercentage30D >= 0 ? '+' : ''}{userGrowth.growthPercentage30D.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            userGrowth.growthPercentage30D >= 0 
              ? 'bg-status-healthy/5 border-status-healthy/10 text-status-healthy' 
              : 'bg-red-500/5 border-red-500/10 text-red-500'
          }`}>
            {userGrowth.growthPercentage30D >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Row 1: User Growth Charts & Provider Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Growth Card (2 columns) */}
        <div className="lg:col-span-2 bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight text-ink">User Growth Registrations</h3>
              <p className="text-xs text-mute opacity-60">Auditing database account creations overtime.</p>
            </div>
            
            {/* Tabs for Daily, Weekly, Monthly */}
            <div className="flex items-center bg-canvas-soft border border-hairline rounded-pill p-1 shadow-inner self-start">
              {(['daily', 'weekly', 'monthly'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveGrowthTab(tab)}
                  className={`px-4 py-1.5 rounded-pill text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeGrowthTab === tab ? 'bg-ink text-canvas shadow-premium-sm' : 'text-mute hover:text-ink'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Premium Area Chart */}
          {hasGrowthData ? (
            <div className="h-48 w-full py-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthDataArray} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--color-mute)" 
                    fontSize={9} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--color-mute)" 
                    fontSize={9} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5}
                    activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#3b82f6' }}
                    fillOpacity={1} 
                    fill="url(#growthGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center border border-dashed border-hairline rounded-[1.75rem] bg-canvas-soft/30 gap-2">
              <BarChart3 className="w-8 h-8 text-mute opacity-30" />
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-mute opacity-55">No Signup Data Available</p>
            </div>
          )}
        </div>

        {/* Auth Provider Analytics (1 column) */}
        <div className="bg-canvas border border-hairline p-6 sm:p-8 rounded-[2.5rem] shadow-premium-lg flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">Authentication Providers</h3>
            <p className="text-xs text-mute opacity-60">Visual split of signups via OAuth vs email credentials.</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 py-2 mt-4">
            <div className="w-24 h-24 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      activeTotalUsers === 0
                        ? [{ value: 1, color: '#ebebeb' }]
                        : providersData.filter((d) => d.value > 0)
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={32}
                    paddingAngle={activeTotalUsers === 0 ? 0 : 4}
                    dataKey="value"
                  >
                    {(activeTotalUsers === 0
                      ? [{ value: 1, color: '#ebebeb' }]
                      : providersData.filter((d) => d.value > 0)
                    ).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  {activeTotalUsers > 0 && <Tooltip content={<CustomPieTooltip />} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 w-full justify-center flex-1 min-w-0">
              {providersData.map((entry) => (
                <div 
                  key={entry.name} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
                  className="text-[11px] sm:text-xs font-bold border-b border-hairline/45 pb-2 last:border-0 last:pb-0 w-full"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-ink font-semibold">{entry.name}</span>
                  </div>
                  <span className="font-mono text-mute whitespace-nowrap shrink-0">
                    {entry.value} {entry.value === 1 ? 'user' : 'users'} ({entry.percent.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-hairline/60 flex items-center justify-between text-[10px] font-bold mt-4 sm:mt-0">
            <span className="text-mute opacity-60 uppercase tracking-widest">Google Signups (30d)</span>
            <div className={`flex items-center gap-1 ${providers.googleGrowth >= 0 ? 'text-status-healthy' : 'text-red-500'}`}>
              {providers.googleGrowth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{providers.googleGrowth >= 0 ? '+' : ''}{providers.googleGrowth.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Report Growth Trends & Platform AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Report Growth Analytics Card */}
        <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">Report Generation Trends</h3>
            <p className="text-xs text-mute opacity-60">Measuring health calculations frequency rates.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-6">
            <div className="p-4 bg-canvas-soft border border-hairline rounded-2xl text-center space-y-1">
              <span className="text-[8px] font-mono font-black text-mute uppercase tracking-widest opacity-60">Today</span>
              <p className="text-2xl font-black text-ink">{reportGrowth.today}</p>
            </div>
            <div className="p-4 bg-canvas-soft border border-hairline rounded-2xl text-center space-y-1">
              <span className="text-[8px] font-mono font-black text-mute uppercase tracking-widest opacity-60">7 Days</span>
              <p className="text-2xl font-black text-ink">{reportGrowth.last7Days}</p>
            </div>
            <div className="p-4 bg-canvas-soft border border-hairline rounded-2xl text-center space-y-1">
              <span className="text-[8px] font-mono font-black text-mute uppercase tracking-widest opacity-60">30 Days</span>
              <p className="text-2xl font-black text-ink">{reportGrowth.last30Days}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-hairline/60 flex items-center justify-between text-[10px] font-bold">
            <span className="text-mute opacity-60 uppercase tracking-widest">30d Growth trend</span>
            <div className={`flex items-center gap-1 ${reportGrowth.growthPercentage30D >= 0 ? 'text-status-healthy' : 'text-red-500'}`}>
              {reportGrowth.growthPercentage30D >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{reportGrowth.growthPercentage30D >= 0 ? '+' : ''}{reportGrowth.growthPercentage30D.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Platform Insights Card (2 columns) */}
        <div className="lg:col-span-2 bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg relative overflow-hidden group">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-ink/[0.02] dark:from-white/5 to-transparent blur-3xl opacity-50 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-ink animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight uppercase text-ink">Platform Intelligence Insights</h3>
                <p className="text-xs text-mute font-medium">Data-driven summaries compiled across active registry behaviors.</p>
              </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {insights.length === 1 && insights[0].includes("Not enough data") ? (
                <div className="col-span-full p-6 bg-canvas-soft border border-hairline rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                  <BarChart3 className="w-8 h-8 text-mute opacity-40" />
                  <p className="text-xs font-bold text-mute">{insights[0]}</p>
                </div>
              ) : (
                insights.map((insight, idx) => (
                  <div key={idx} className="p-4 bg-canvas-soft border border-hairline rounded-2xl flex items-start gap-3 hover:bg-surface transition-all duration-200">
                    <div className="w-5 h-5 rounded-full bg-status-healthy/20 border border-status-healthy/30 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-status-healthy" />
                    </div>
                    <p className="text-[11px] font-bold text-ink leading-normal">{insight}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: BMI Distribution breakdown & Calculator Usage ranks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Calculator Distribution */}
        <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">Calculator Distribution</h3>
            <p className="text-xs text-mute opacity-60">Visual breakdown of saved health reports by calculator type.</p>
          </div>
 
          {hasCalculatorsData ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-2">
              <div className="w-32 h-32 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={calculatorData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {calculatorData.filter((d) => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomCalculatorTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5 w-full justify-center flex-1 min-w-0">
                {calculatorData.map((entry) => (
                  <div 
                    key={entry.name} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
                    className="text-[11px] sm:text-xs font-bold border-b border-hairline/45 pb-1.5 last:border-0 last:pb-0 w-full"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-ink font-semibold truncate">{entry.name}</span>
                    </div>
                    <span className="font-mono text-mute whitespace-nowrap shrink-0">
                      {entry.value} {entry.value === 1 ? 'report' : 'reports'} ({entry.percent.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center border border-dashed border-hairline rounded-[1.75rem] bg-canvas-soft/30 gap-2">
              <Activity className="w-8 h-8 text-mute opacity-30" />
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-mute opacity-55">No reports generated yet</p>
            </div>
          )}
        </div>
 
        {/* Calculator usage rankings */}
        <div className="bg-canvas border border-hairline p-8 rounded-[2.5rem] shadow-premium-lg flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-ink">Calculator Usage Rankings</h3>
            <p className="text-xs text-mute opacity-60">Top-performing calculators by saved report volume.</p>
          </div>
 
          {hasCalculatorsData ? (
            <div className="h-52 w-full py-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={calculators} 
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="var(--color-mute)" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="var(--color-ink)" 
                    fontSize={9} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={false}
                    width={115}
                  />
                  <Tooltip content={<CustomCalcTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                    {calculators.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={calculatorColors[entry.type] || 'var(--color-ink)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center border border-dashed border-hairline rounded-[1.75rem] bg-canvas-soft/30 gap-2">
              <BarChart3 className="w-8 h-8 text-mute opacity-30" />
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-mute opacity-55">No Calculations Found</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Top 10 Active Users Registry Table */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-ink" />
            <h3 className="text-2xl font-black tracking-tight text-ink">Top 10 Active Users Registry</h3>
          </div>
          <p className="text-[10px] font-mono font-black text-mute uppercase tracking-widest">Ranked by Activity Score</p>
        </div>

        <div className="bg-canvas border border-hairline rounded-[2.5rem] overflow-hidden shadow-premium-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-soft border-b border-hairline">
                  <th className="w-[8%] min-w-[70px] py-5 px-6 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] whitespace-nowrap">Rank</th>
                  <th className="w-[22%] min-w-[150px] py-5 px-6 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] whitespace-nowrap">User Profile</th>
                  <th className="w-[35%] min-w-[200px] py-5 px-6 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] whitespace-nowrap">Email Address</th>
                  <th className="w-[15%] min-w-[130px] py-5 px-6 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] whitespace-nowrap">Reports Generated</th>
                  <th className="w-[15%] min-w-[130px] py-5 px-6 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] whitespace-nowrap">Tracker Profiles</th>
                  <th className="w-[5%] min-w-[90px] py-5 px-6 text-[9px] font-mono font-black text-mute uppercase tracking-[0.2em] text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {activeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-mute font-black uppercase tracking-widest text-[9px] opacity-40">Empty Active Registry</td>
                  </tr>
                ) : (
                  activeUsers.map((user) => (
                    <tr 
                      key={user.id}
                      onClick={() => window.location.href = `/admin/users/${user.id}`}
                      className="hover:bg-canvas-soft/40 transition-colors group cursor-pointer"
                    >
                      {/* Rank */}
                      <td className="py-5 px-6 font-mono font-black text-ink text-xs whitespace-nowrap">
                        #{user.rank}
                      </td>

                      {/* Name */}
                      <td className="py-5 px-6 font-black text-ink text-sm tracking-tight truncate max-w-[180px] whitespace-nowrap">
                        {user.name}
                      </td>

                      {/* Email */}
                      <td className="py-5 px-6 text-[11px] font-mono font-bold text-mute uppercase tracking-widest opacity-60 whitespace-nowrap">
                        {user.email}
                      </td>

                      {/* Reports Generated */}
                      <td className="py-5 px-6 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-pill bg-green-500/5 border border-green-500/10 text-[9px] font-mono font-black text-green-600">
                          {user.reportsCount} Reports
                        </span>
                      </td>

                      {/* Tracker Profiles */}
                      <td className="py-5 px-6 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-pill bg-blue-500/5 border border-blue-500/10 text-[9px] font-mono font-black text-blue-600">
                          {user.profilesCount} Profiles
                        </span>
                      </td>

                      {/* View Action */}
                      <td className="py-5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <span className="text-[8px] font-mono font-black uppercase tracking-widest text-mute opacity-0 group-hover:opacity-65 transition-opacity mr-2">Audit User</span>
                          <div className="w-8 h-8 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mute group-hover:text-ink transition-colors shadow-premium-sm group-hover:rotate-45">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </div>
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
