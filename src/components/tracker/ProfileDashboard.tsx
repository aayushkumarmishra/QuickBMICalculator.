import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Filter, 
  Calendar, 
  FileText, 
  Download, 
  Trash2, 
  ExternalLink,
  Activity,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ReportDetailModal } from './ReportDetailModal';
import { DeleteReportModal } from './DeleteReportModal';
import { 
  formatBMI, 
  formatKcal, 
  formatWater, 
  formatRange 
} from '../../lib/format';

import { TrackerHero } from './TrackerHero';

interface ProfileDashboardProps {
  profileId: string;
}

interface Profile {
  id: string;
  profile_name: string;
  relation_type: string;
  nickname?: string;
  created_at: string;
}

interface Report {
  id: string;
  calculator_type: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake' | 'body_fat' | 'lean_body_mass' | 'protein_intake' | 'macro' | 'daily_nutrition';
  input_data: any;
  result_data: any;
  created_at: string;
}

const TABS = [
  { id: 'all', label: 'All Reports' },
  { id: 'bmi', label: 'BMI' },
  { id: 'bmr', label: 'BMR' },
  { id: 'calorie', label: 'Calories' },
  { id: 'ideal_weight', label: 'Ideal Weight' },
  { id: 'water_intake', label: 'Water' },
  { id: 'body_fat', label: 'Body Fat' },
  { id: 'lean_body_mass', label: 'Lean Mass' },
  { id: 'protein_intake', label: 'Protein' },
  { id: 'macro', label: 'Macros' },
  { id: 'daily_nutrition', label: 'Nutrition' },
];

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ profileId }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  // Modals
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      // 1. Fetch Profile & Verify Ownership
      const { data: profileData, error: pError } = await supabase
        .from('tracker_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (pError || !profileData) {
        setError('Profile not found or access denied.');
        return;
      }

      if (profileData.user_id !== session.user.id) {
        setError('Unauthorized access.');
        return;
      }

      setProfile(profileData);

      // 2. Fetch Reports
      const { data: reportData, error: rError } = await supabase
        .from('health_reports')
        .select('*')
        .eq('tracker_profile_id', profileId)
        .order('created_at', { ascending: false });

      if (rError) throw rError;
      setReports(reportData || []);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = activeTab === 'all' 
    ? reports 
    : reports.filter(r => r.calculator_type === activeTab);

  const handleDeleteSuccess = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
    setReportToDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-ink animate-spin" />
        <p className="text-sm font-mono font-bold text-mute uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tighter text-ink mb-2">Access Denied</h2>
        <p className="text-mute mb-8">{error || 'You do not have permission to view this profile.'}</p>
        <a 
          href="/tracker"
          className="px-8 py-3 bg-ink text-canvas rounded-pill font-bold uppercase tracking-widest text-xs"
        >
          Back to Tracker
        </a>
      </div>
    );
  }

  const profileDisplayName = profile.nickname 
    ? `${profile.profile_name} (${profile.nickname})` 
    : profile.profile_name;

  return (
    <div className="w-full">
      <TrackerHero 
        backLink={{ href: '/tracker', label: 'Back to Tracker' }}
        metadata={
          <>
            <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[10px] font-mono font-bold uppercase tracking-widest">
              {profile.relation_type}
            </span>
            <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest border-l border-hairline pl-3">
              Joined {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </>
        }
        title={<span className="bg-linear-to-r from-status-healthy to-status-under bg-clip-text text-transparent dark:bg-none dark:text-ink">{profileDisplayName}</span>}
        description={`Comprehensive health monitoring and history tracking for ${profileDisplayName}.`}
        rightContent={
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full sm:w-auto">
            <div className="px-5 py-4 bg-canvas border border-hairline rounded-3xl shadow-premium-sm flex flex-col items-center justify-center min-w-[110px] sm:min-w-[130px] group hover:shadow-premium-md transition-all flex-1 sm:flex-none">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-2 opacity-60">Reports</span>
              <span className="text-3xl font-black text-ink group-hover:scale-110 transition-transform">{reports.length}</span>
            </div>
            <div className="px-5 py-4 bg-canvas border border-hairline rounded-3xl shadow-premium-sm flex flex-col items-center justify-center min-w-[110px] sm:min-w-[130px] group hover:shadow-premium-md transition-all flex-1 sm:flex-none">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] mb-2 opacity-60">Status</span>
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-10 mt-8 overflow-x-auto no-scrollbar -mx-6 px-6">
        <div className="flex items-center gap-2 min-w-max border-b border-hairline">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab.id ? 'text-ink' : 'text-mute hover:text-ink'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <AnimatePresence mode="wait">
        {filteredReports.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="py-20 text-center bg-canvas border border-hairline border-dashed rounded-[2.5rem]"
          >
            <div className="w-16 h-16 bg-canvas-soft rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-8 h-8 text-mute/30" />
            </div>
            <h3 className="text-xl font-black tracking-tighter text-ink mb-2">No reports found</h3>
            <p className="text-sm text-mute font-medium mb-8">No saved reports for this category yet.</p>
            <a 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-canvas rounded-pill font-bold uppercase tracking-widest text-[10px] shadow-premium-lg"
            >
              Go to Calculators
            </a>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredReports.map((report) => (
              <ReportCard 
                key={report.id} 
                report={report} 
                profileName={profile.profile_name}
                nickname={profile.nickname}
                relation={profile.relation_type}
                onView={() => setSelectedReport(report)}
                onDelete={() => setReportToDelete(report)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <ReportDetailModal 
        report={selectedReport} 
        profile={profile}
        onClose={() => setSelectedReport(null)} 
      />

      <DeleteReportModal 
        reportId={reportToDelete?.id || ''} 
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onSuccess={() => handleDeleteSuccess(reportToDelete?.id || '')}
      />
    </div>
  );
};

const ReportCard: React.FC<{ 
  report: Report, 
  profileName: string,
  nickname?: string,
  relation?: string,
  onView: () => void,
  onDelete: () => void 
}> = ({ report, profileName, nickname, relation, onView, onDelete }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const { generateReportPDF } = await import('../../lib/pdf');
      await generateReportPDF({
        profileName,
        nickname,
        relation,
        calculatorType: report.calculator_type,
        inputData: report.input_data,
        resultData: report.result_data,
        date: new Date(report.created_at).toLocaleDateString('en-GB')
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getSummary = () => {
    const { calculator_type, result_data } = report;
    
    // Safety check for result_data
    if (!result_data) {
      return (
        <div className="flex items-center justify-center p-2 text-[10px] font-bold text-mute uppercase tracking-widest">
          Data Missing
        </div>
      );
    }

    try {
      switch (calculator_type) {
        case 'bmi': 
          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">BMI</span>
                <span className="text-sm font-black text-ink">{formatBMI(result_data.bmi || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Status</span>
                <span className="text-sm font-black text-primary">{result_data.category || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Healthy</span>
                <span className="text-[10px] font-bold text-ink">18.5–24.9</span>
              </div>
            </div>
          );
        case 'bmr': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Daily Burn</span>
              <span className="text-lg font-black text-ink">{formatKcal(result_data.bmr || 0)}</span>
            </div>
          );
        case 'calorie': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Goal</span>
              <span className="text-lg font-black text-ink">{formatKcal(result_data.maintenance || 0)}</span>
            </div>
          );
        case 'ideal_weight': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Healthy Range</span>
              <span className="text-lg font-black text-ink">
                {result_data.range ? formatRange(result_data.range.min, result_data.range.max, 'kg') : 'N/A'}
              </span>
            </div>
          );
        case 'water_intake': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Daily Intake</span>
              <span className="text-lg font-black text-ink">{formatWater(result_data.waterIntake || 0)}</span>
            </div>
          );
        case 'body_fat': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Body Fat</span>
              <span className="text-lg font-black text-ink">{Number(result_data.bodyFat || 0).toFixed(1)}%</span>
            </div>
          );
        case 'lean_body_mass': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Lean Mass</span>
              <span className="text-lg font-black text-ink">{Number(result_data.leanMass || 0).toFixed(1)} kg</span>
            </div>
          );
        case 'protein_intake': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Protein Goal</span>
              <span className="text-lg font-black text-ink">{Math.round(result_data.proteinGoal || 0)} g</span>
            </div>
          );
        case 'macro': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Macros</span>
              <span className="text-xs font-black text-ink">
                {Math.round(result_data.carbsGrams || 0)}c/{Math.round(result_data.proteinGrams || 0)}p/{Math.round(result_data.fatGrams || 0)}f
              </span>
            </div>
          );
        case 'daily_nutrition': 
          return (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Calories</span>
              <span className="text-lg font-black text-ink">{Math.round(result_data.targetCalories || 0)} kcal</span>
            </div>
          );
        default: 
          return (
            <div className="flex items-center justify-center p-2 text-[10px] font-bold text-mute uppercase tracking-widest">
              Report View
            </div>
          );
      }
    } catch (err) {
      console.error('Error rendering report summary:', err);
      return (
        <div className="flex items-center justify-center p-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">
          Render Error
        </div>
      );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      whileHover={{ 
        y: -6, 
        scale: 1.02,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)"
      }}
      className="bg-canvas border border-hairline rounded-[2rem] p-6 sm:p-8 transition-all duration-500 flex flex-col cursor-pointer"
    >
      <div className="flex justify-between items-start mb-6">
        <motion.div 
          whileHover={{ rotate: 15, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-10 h-10 rounded-xl bg-canvas-soft flex items-center justify-center border border-hairline"
        >
          <Activity className="w-5 h-5 text-ink" />
        </motion.div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-3 text-mute hover:text-red-500 transition-colors rounded-xl hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-8">
        <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest mb-1">
          {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <h3 className="text-lg font-black tracking-tighter text-ink uppercase mb-4">
          {report.calculator_type.replace('_', ' ')}
        </h3>
        <div className="p-4 bg-canvas-soft/50 rounded-2xl border border-hairline/50 hover:bg-canvas-soft transition-all duration-300">
          {getSummary()}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="h-11 bg-canvas border border-hairline text-ink rounded-pill font-bold text-[10px] uppercase tracking-widest hover:bg-canvas-soft hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          disabled={isExporting}
          className="h-11 bg-ink text-canvas rounded-pill font-bold text-[10px] uppercase tracking-widest hover:shadow-premium-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PDF
        </button>
      </div>
    </motion.div>
  );
};
