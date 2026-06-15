import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, UserPlus, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TrackerProfile {
  id: string;
  profile_name: string;
  relation_type: 'self' | 'family' | 'friend' | 'other';
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

      const { data, error } = await supabase
        .from('tracker_profiles')
        .insert([
          { 
            user_id: user.id,
            profile_name: newProfileName.trim(), 
            relation_type: newProfileRelation 
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setProfiles(prev => [...prev, data]);
      setSelectedProfileId(data.id);
      setIsAddingProfile(false);
      setNewProfileName('');
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

      const { error } = await supabase
        .from('health_reports')
        .insert([
          {
            user_id: user.id,
            tracker_profile_id: selectedProfileId,
            calculator_type: calculatorType,
            input_data: inputData,
            result_data: resultData
          }
        ]);

      if (error) throw error;

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


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
          />
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[111] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-canvas border border-hairline rounded-[2rem] shadow-premium-xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-hairline flex justify-between items-center bg-canvas">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                    <Save className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter text-ink leading-tight">Save Report.</h3>
                    <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest">Select Profile</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-canvas-soft rounded-full transition-colors text-mute hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                {success ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                      <Check className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-black tracking-tighter text-ink mb-2">Saved Successfully.</h4>
                    <p className="text-sm text-mute font-medium">✓ Report saved successfully</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-mute font-medium leading-relaxed mb-6">
                      Choose a profile to save this report. You can track progress over time for different people.
                    </p>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold">{error}</p>
                      </div>
                    )}

                    <div className="space-y-3 mb-8">
                      {isLoading && profiles.length === 0 ? (
                        <div className="py-8 flex justify-center">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : (
                        profiles.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => setSelectedProfileId(profile.id)}
                            className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                              selectedProfileId === profile.id 
                                ? 'border-ink bg-ink text-canvas shadow-premium-md' 
                                : 'border-hairline bg-canvas text-ink hover:border-hairline-strong hover:bg-canvas-soft'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase ${
                                selectedProfileId === profile.id ? 'bg-white/10' : 'bg-canvas-soft'
                              }`}>
                                {profile.profile_name.charAt(0)}
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-sm leading-none mb-1">{profile.profile_name}</p>
                                <p className={`text-[9px] font-mono font-bold uppercase tracking-widest ${
                                  selectedProfileId === profile.id ? 'text-canvas/60' : 'text-mute'
                                }`}>
                                  {profile.relation_type}
                                </p>
                              </div>
                            </div>
                            {selectedProfileId === profile.id && (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        ))
                      )}

                      {!isAddingProfile ? (
                        <button
                          onClick={() => setIsAddingProfile(true)}
                          className="w-full p-4 rounded-2xl border border-dashed border-hairline-strong text-mute hover:text-ink hover:border-ink transition-all flex items-center justify-center gap-2 group"
                        >
                          <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold uppercase tracking-widest">Add New Profile</span>
                        </button>
                      ) : (
                        <motion.form 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handleCreateProfile}
                          className="p-5 border border-hairline rounded-2xl bg-canvas-soft/50 space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest ml-1">Profile Name</label>
                            <input
                              autoFocus
                              type="text"
                              value={newProfileName}
                              onChange={(e) => setNewProfileName(e.target.value)}
                              placeholder="e.g. Mom, Dad, John"
                              className="w-full h-11 bg-canvas border border-hairline rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-ink transition-all"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest ml-1">Relation</label>
                            <select
                              value={newProfileRelation}
                              onChange={(e) => setNewProfileRelation(e.target.value as any)}
                              className="w-full h-11 bg-canvas border border-hairline rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-ink transition-all appearance-none cursor-pointer"
                            >
                              <option value="self">Myself</option>
                              <option value="family">Family</option>
                              <option value="friend">Friend</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsAddingProfile(false)}
                              className="flex-1 h-10 text-[10px] font-bold uppercase tracking-widest text-mute hover:text-ink transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!newProfileName.trim() || isLoading}
                              className="flex-[2] h-10 bg-ink text-canvas rounded-pill text-[10px] font-bold uppercase tracking-widest shadow-premium-sm hover:shadow-premium-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <span>Create Profile</span>
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </div>

                    <button
                      onClick={handleSaveReport}
                      disabled={!selectedProfileId || isSaving || isAddingProfile}
                      className="w-full h-14 bg-ink text-canvas rounded-pill font-black text-xs uppercase tracking-[0.2em] shadow-premium-lg hover:shadow-premium-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      )}
                      <span>{isSaving ? 'Saving...' : 'Confirm Save'}</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
