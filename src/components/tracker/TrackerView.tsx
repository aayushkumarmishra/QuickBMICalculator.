import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrackerCard } from './TrackerCard';
import { Loader2, Plus, ArrowRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TrackerHero } from './TrackerHero';

export interface ProfileWithStats {
  id: string;
  profile_name: string;
  relation_type: 'self' | 'family' | 'friend' | 'other';
  nickname?: string;
  created_at: string;
  reportCount: number;
  lastActivity: string | null;
}

export const TrackerView: React.FC = () => {
  const [profiles, setProfiles] = useState<ProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkAuthAndFetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        setUser(session.user);
        await fetchTrackerData(session.user.id);
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Authentication error. Please try logging in again.');
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, []);

  const fetchTrackerData = async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_profiles_with_stats');
      if (error) throw error;

      const profilesWithStats: ProfileWithStats[] = (data || []).map((profile: any) => ({
        id: profile.id,
        profile_name: profile.profile_name,
        relation_type: profile.relation_type,
        nickname: profile.nickname || undefined,
        created_at: profile.created_at,
        reportCount: profile.report_count || 0,
        lastActivity: profile.last_activity || null
      }));

      setProfiles(profilesWithStats);
    } catch (err: any) {
      console.error('Error fetching tracker data:', err);
      setError('Failed to load tracker profiles. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
  };

  if (!isMounted || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-ink animate-spin" />
        <p className="text-sm font-mono font-bold text-mute uppercase tracking-widest">Loading Profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
          <Activity className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tighter text-ink mb-2">Something went wrong</h2>
        <p className="text-mute mb-8">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-ink text-canvas rounded-pill font-bold uppercase tracking-widest text-xs"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <TrackerHero 
        title={<>My <span className="tracking-normal text-gradient-status">Tracker</span></>}
        description="Monitor health progress for yourself and your loved ones in one unified dashboard."
        rightContent={profiles.length > 0 && (
          <a 
            href="/"
            className="inline-flex items-center gap-3 px-8 py-4 bg-ink text-canvas rounded-pill font-black uppercase tracking-widest text-[10px] shadow-premium-lg hover:shadow-premium-xl hover:scale-[1.02] active:scale-95 transition-all group mt-2"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
            <span>Create New Report</span>
          </a>
        )}
      />

      <AnimatePresence mode="wait">
        {profiles.length === 0 ? (
          <motion.div 
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-canvas border border-hairline border-dashed rounded-[2.5rem] p-12 sm:p-20 text-center flex flex-col items-center justify-center"
          >
            <div className="w-20 h-20 bg-canvas-soft rounded-full flex items-center justify-center mb-8">
              <Activity className="w-10 h-10 text-mute/50" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-ink mb-4">
              No tracker profiles yet
            </h2>
            <p className="text-mute font-medium max-w-md mb-10 leading-relaxed">
              Use a calculator and save reports to start tracking progress for yourself and your family.
            </p>
            <a 
              href="/"
              className="inline-flex items-center gap-3 px-10 py-4 bg-ink text-canvas rounded-pill font-black uppercase tracking-widest text-xs shadow-premium-lg hover:shadow-premium-xl hover:scale-[1.02] transition-all group"
            >
              <span>Go to Calculators</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        ) : (
          <motion.div 
            key="profile-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {profiles.map((profile) => (
              <TrackerCard 
                key={profile.id} 
                profile={profile} 
                onDelete={handleDeleteProfile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
