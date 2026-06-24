import React, { useState } from 'react';
import { type ProfileWithStats } from './TrackerView';
import { Trash2, ExternalLink, Calendar, FileText, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { DeleteProfileModal } from './DeleteProfileModal';

interface TrackerCardProps {
  profile: ProfileWithStats;
  onDelete: (id: string) => void;
}

export const TrackerCard: React.FC<TrackerCardProps> = ({ profile, onDelete }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No reports yet';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRelationIcon = (type: string) => {
    switch (type) {
      case 'self': return '👤';
      case 'family': return '🏠';
      case 'friend': return '👋';
      default: return '📍';
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => window.location.href = `/tracker/${profile.id}`}
        className="group bg-canvas border border-hairline rounded-[2rem] p-6 sm:p-8 hover:shadow-premium-xl hover:border-ink/10 transition-all duration-500 relative flex flex-col h-full cursor-pointer"
      >
        {/* Profile Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-canvas-soft border border-hairline flex items-center justify-center text-sm font-black uppercase group-hover:scale-110 transition-transform duration-500">
              {profile.profile_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter text-ink leading-tight">
                {profile.profile_name}
                {profile.nickname && (
                  <span className="text-sm font-bold text-mute ml-1.5 opacity-70">({profile.nickname})</span>
                )}
              </h3>
              <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em]">
                {profile.relation_type}
              </p>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteModalOpen(true);
            }}
            className="p-2.5 rounded-full text-mute hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
            title="Delete Profile"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-canvas-soft rounded-2xl border border-hairline/50">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3 h-3 text-mute" />
              <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest">Reports</span>
            </div>
            <p className="text-xl font-black text-ink">{profile.reportCount}</p>
          </div>
          <div className="p-4 bg-canvas-soft rounded-2xl border border-hairline/50">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3 h-3 text-mute" />
              <span className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest">Activity</span>
            </div>
            <p className="text-[11px] font-bold text-ink leading-tight">
              {profile.lastActivity ? formatDate(profile.lastActivity) : 'None'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <div
            className="w-full h-12 bg-canvas border border-hairline text-ink rounded-pill font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 group-hover:bg-ink group-hover:text-canvas group-hover:border-ink transition-all"
          >
            <span>Open Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>

        {/* Subtle Bottom Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-ink/5 to-transparent"></div>
      </motion.div>

      <DeleteProfileModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          onDelete(profile.id);
          setIsDeleteModalOpen(false);
        }}
        profileName={profile.profile_name}
        profileId={profile.id}
      />
    </>
  );
};
