import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus, ArrowRight, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[101] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-canvas border border-hairline rounded-[2rem] shadow-premium-xl pointer-events-auto overflow-hidden relative"
            >
              {/* Subtle Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[radial-gradient(circle,rgba(23,23,23,0.03)_0%,transparent_70%)] blur-[60px] rounded-full"></div>
              </div>

              <div className="p-8 sm:p-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-canvas-soft rounded-full transition-colors text-mute hover:text-ink"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-2xl font-black tracking-tighter text-ink mb-3">Login Required</h3>
                <p className="text-sm text-mute font-medium leading-relaxed mb-6">
                  Create an account or login to save reports, track progress, and download PDF reports.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    'Save reports',
                    'Track health progress',
                    'Download PDF reports'
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-xs font-bold text-ink/80">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                    className="w-full h-14 bg-ink text-canvas rounded-pill font-black text-xs uppercase tracking-[0.2em] shadow-premium-lg hover:shadow-premium-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => window.location.href = `/signup?returnTo=${encodeURIComponent(window.location.pathname)}`}
                    className="w-full h-14 bg-canvas border border-hairline text-ink rounded-pill font-black text-xs uppercase tracking-[0.2em] hover:bg-canvas-soft transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-4 text-[10px] font-mono font-bold text-mute hover:text-ink uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Continue Without Saving</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
