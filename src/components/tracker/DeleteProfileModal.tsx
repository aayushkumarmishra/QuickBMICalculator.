import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  profileName: string;
  profileId: string;
}

export const DeleteProfileModal: React.FC<DeleteProfileModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  profileName,
  profileId
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('tracker_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      onConfirm();
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      setError(err.message || 'Failed to delete profile. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Premium Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-[400px] bg-canvas border border-hairline rounded-[2.5rem] shadow-premium-2xl relative z-[112] overflow-hidden"
          >
            {/* Header / Icon Section */}
            <div className="pt-10 pb-6 flex flex-col items-center text-center px-8">
              <div className="w-16 h-16 rounded-3xl bg-red-50/50 border border-red-100 flex items-center justify-center mb-6 relative group transition-all">
                <div className="absolute inset-0 bg-red-100/30 blur-xl rounded-full group-hover:bg-red-200/40 transition-colors" />
                <Trash2 className="w-7 h-7 text-red-500 relative z-10" />
              </div>
              
              <h3 className="text-2xl font-black tracking-tighter text-ink mb-2 leading-tight">
                Delete Profile.
              </h3>
              <p className="text-sm text-mute font-medium">
                This action cannot be undone.
              </p>
            </div>

            <div className="h-px bg-hairline w-full" />

            {/* Content Section */}
            <div className="p-8 text-center">
              <div className="space-y-4 mb-10">
                <p className="text-sm font-medium text-mute leading-relaxed">
                  You're about to permanently delete <span className="text-ink font-bold">"{profileName}"</span> and all associated reports.
                </p>
                <p className="text-[11px] font-mono font-bold text-mute/60 uppercase tracking-widest leading-relaxed">
                  All health tracking history for this profile will be removed.
                </p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full h-14 bg-red-500 text-white rounded-pill font-black text-xs uppercase tracking-[0.2em] shadow-premium-lg hover:bg-red-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 group"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  )}
                  <span>{isDeleting ? 'Deleting...' : 'Delete Profile'}</span>
                </button>
                
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="w-full h-14 bg-canvas border border-hairline text-ink rounded-pill font-black text-xs uppercase tracking-[0.2em] hover:bg-canvas-soft transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Close Button (Icon) */}
            <button 
              onClick={onClose}
              disabled={isDeleting}
              className="absolute top-6 right-6 p-2 text-mute hover:text-ink hover:bg-canvas-soft rounded-full transition-all disabled:opacity-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
