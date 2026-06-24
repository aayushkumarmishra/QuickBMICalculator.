import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, UserPlus, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/audit';

interface TrackerProfile {
  id: string;
  profile_name: string;
  relation_type: 'self' | 'family' | 'friend' | 'other';
  nickname?: string;
}

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  calculatorType: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake';
  inputData: any;
  resultData: any;
}

export const SaveModal: React.FC<SaveModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  calculatorType, 
  inputData, 
  resultData 
}) => {
  const [profiles, setProfiles] = useState<TrackerProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileNickname, setNewProfileNickname] = useState('');
  const [newProfileRelation, setNewProfileRelation] = useState<'self' | 'family' | 'friend' | 'other'>('family');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracker_profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
      
      // Auto-select "self" profile if it exists and nothing is selected
      if (data && data.length > 0 && !selectedProfileId) {
        const selfProfile = data.find(p => p.relation_type === 'self');
        if (selfProfile) setSelectedProfileId(selfProfile.id);
        else setSelectedProfileId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newProfile, error } = await supabase
        .from('tracker_profiles')
        .insert([
          { 
            user_id: user.id,
            profile_name: newProfileName.trim(), 
            relation_type: newProfileRelation,
            nickname: newProfileNickname.trim().slice(0, 50) || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Log tracker profile creation
      try {
        await logActivity('Tracker Profile Created', 'tracker_profile', newProfile?.id || null, `New tracker profile created`);
      } catch (logErr) {
        console.error('Failed to log tracker profile creation:', logErr);
      }

      setProfiles(prev => [...prev, newProfile]);
      setSelectedProfileId(newProfile.id);
      setIsAddingProfile(false);
      setNewProfileName('');
      setNewProfileNickname('');
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedProfileId) {
      setError('Please select a profile');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newReport, error } = await supabase
        .from('health_reports')
        .insert([
          {
            user_id: user.id,
            tracker_profile_id: selectedProfileId,
            calculator_type: calculatorType,
            input_data: inputData,
            result_data: resultData
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Log report generation
      try {
        await logActivity('Report Generated', 'report', newReport?.id || null, `${calculatorType} report saved for profile`);
      } catch (logErr) {
        console.error('Failed to log report generation:', logErr);
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      console.error('Error saving report:', err);
      setError('Failed to save report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getProfileDisplay = (profile: TrackerProfile) => {
    if (profile.nickname) {
      return `${profile.profile_name} (${profile.nickname})`;
    }
    return profile.profile_name;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[199]"
          />
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[200] p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[440px] bg-canvas border border-hairline rounded-[2.5rem] shadow-premium-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh] relative"
              data-modal="save-report"
            >
              <div className="pt-5 px-6 pb-4 border-b border-hairline flex justify-between items-start bg-canvas sticky top-0 z-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-ink text-canvas flex items-center justify-center shadow-premium-md shrink-0">
                    <Save className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter text-ink leading-tight">Save Report</h3>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] mt-1">Health Dashboard</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    document.body.style.overflow = '';
                    onClose();
                  }}
                  className="p-2 hover:bg-canvas-soft rounded-full transition-all text-mute hover:text-ink hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                {success ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center shadow-inner">
                      <Check className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black tracking-tighter text-ink mb-2">Saved Successfully.</h4>
                      <p className="text-sm text-mute font-medium max-w-[200px] mx-auto">Your health data is now safely stored in your dashboard.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-ink font-bold leading-tight">Select a profile</p>
                      <p className="text-xs text-mute font-medium leading-relaxed">
                        Choose who this report belongs to. You can track individual progress over time.
                      </p>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 shadow-premium-sm"
                      >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold leading-tight">{error}</p>
                      </motion.div>
                    )}

                    <div className="space-y-3">
                      {isLoading && profiles.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                          <Loader2 className="w-8 h-8 text-ink/20 animate-spin" />
                          <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Loading Profiles...</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {profiles.map((profile) => (
                            <button
                              key={profile.id}
                              onClick={() => setSelectedProfileId(profile.id)}
                              className={`w-full p-4 rounded-[1.5rem] border transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                                selectedProfileId === profile.id 
                                  ? 'border-ink bg-surface shadow-premium-xl scale-[1.02] ring-1 ring-ink/10' 
                                  : 'border-hairline bg-canvas text-ink hover:border-hairline-strong hover:bg-canvas-soft active:scale-[0.98]'
                              }`}
                            >
                              <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black uppercase transition-all duration-300 ${
                                  selectedProfileId === profile.id ? 'bg-ink text-canvas shadow-premium-sm' : 'bg-canvas-soft text-mute'
                                }`}>
                                  {profile.profile_name.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-sm leading-tight mb-0.5">{getProfileDisplay(profile)}</p>
                                  <p className={`text-[9px] font-mono font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
                                    selectedProfileId === profile.id ? 'text-mute/80' : 'text-mute'
                                  }`}>
                                    {profile.relation_type}
                                  </p>
                                </div>
                              </div>
                              {selectedProfileId === profile.id && (
                                <motion.div 
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="relative z-10 w-6 h-6 bg-ink text-canvas rounded-full flex items-center justify-center shadow-premium-md"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </motion.div>
                              )}
                              
                              {/* Selection Glow Effect */}
                              {selectedProfileId === profile.id && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-ink/5 via-transparent to-transparent pointer-events-none" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {!isAddingProfile ? (
                        <button
                          onClick={() => setIsAddingProfile(true)}
                          className="w-full py-5 rounded-[1.5rem] border border-dashed border-hairline-strong text-mute hover:text-ink hover:border-ink hover:bg-canvas-soft/50 transition-all flex flex-col items-center justify-center gap-2 group mt-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-canvas-soft flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]">New Profile</span>
                        </button>
                      ) : (
                        <motion.form 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handleCreateProfile}
                          className="p-6 border border-hairline rounded-[1.5rem] bg-canvas-soft/40 space-y-5"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest ml-1">Profile Name</label>
                              <input
                                autoFocus
                                type="text"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                placeholder="e.g. Rahul"
                                className="w-full h-12 bg-canvas border border-hairline rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-ink transition-all placeholder:text-mute/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest ml-1">Nickname (Opt)</label>
                              <input
                                type="text"
                                value={newProfileNickname}
                                onChange={(e) => setNewProfileNickname(e.target.value)}
                                placeholder="e.g. Gym"
                                className="w-full h-12 bg-canvas border border-hairline rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-ink transition-all placeholder:text-mute/50"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest ml-1">Relation</label>
                            <div className="relative">
                              <select
                                value={newProfileRelation}
                                onChange={(e) => setNewProfileRelation(e.target.value as any)}
                                className="w-full h-12 bg-canvas border border-hairline rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-ink transition-all appearance-none cursor-pointer"
                              >
                                <option value="self">Myself</option>
                                <option value="family">Family</option>
                                <option value="friend">Friend</option>
                                <option value="other">Other</option>
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-mute">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsAddingProfile(false)}
                              className="flex-1 h-11 text-[10px] font-bold uppercase tracking-widest text-mute hover:text-ink transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!newProfileName.trim() || isLoading}
                              className="flex-[2] h-11 bg-ink text-canvas rounded-full text-[10px] font-bold uppercase tracking-widest shadow-premium-md hover:shadow-premium-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Create Profile</span>
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </div>
                  </>
                )}
              </div>

              {!success && (
                <div className="p-8 border-t border-hairline bg-canvas/80 backdrop-blur-md sticky bottom-0 z-10">
                  <button
                    onClick={handleSaveReport}
                    disabled={!selectedProfileId || isSaving || isAddingProfile}
                    className="w-full h-16 bg-ink text-canvas rounded-full font-black text-sm uppercase tracking-[0.25em] shadow-premium-xl hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all active:scale-[0.97] flex items-center justify-center gap-4 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    <span>{isSaving ? 'Saving Data...' : 'Confirm & Save'}</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
