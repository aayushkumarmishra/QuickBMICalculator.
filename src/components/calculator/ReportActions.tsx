import React, { useState, useEffect } from 'react';
import { Download, Save, Check, RotateCcw, Lock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { AuthModal } from './AuthModal';
import { SaveModal } from './SaveModal';

interface ReportActionsProps {
  onDownload: () => void;
  isExporting: boolean;
  hasResult: boolean;
  isValidName: boolean;
  calculatorType: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake';
  inputData: any;
  resultData: any;
}

export const ReportActions: React.FC<ReportActionsProps> = ({ 
  onDownload, 
  isExporting, 
  hasResult, 
  isValidName,
  calculatorType,
  inputData,
  resultData
}) => {
  const [session, setSession] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthRedirect = () => {
    // Save state before opening auth modal for persistence during login redirect
    const key = `${calculatorType}_calculator_state`;
    sessionStorage.setItem(key, JSON.stringify(inputData));
    setIsAuthModalOpen(true);
  };

  const handleAction = (type: 'download' | 'save') => {
    if (!session) {
      handleAuthRedirect();
      return;
    }

    if (type === 'download') {
      onDownload();
    } else {
      setIsSaveModalOpen(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const modal = document.querySelector('[data-modal="save-report"]');
        if (modal) {
          const rect = modal.getBoundingClientRect();
          const scrollTop = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
          window.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }, 50);
      window.dispatchEvent(new Event('modalOpen'));
    }
  };

  const handleSaveSuccess = () => {
    setIsSaveModalOpen(false);
    document.body.style.overflow = '';
    window.dispatchEvent(new Event('modalClose'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const isDisabled = !hasResult || !isValidName;

  return (
    <div className="w-full relative">
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-ink text-canvas px-6 py-3 rounded-full shadow-premium-xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold tracking-tight">✓ Report saved successfully</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!session ? (
        <div className="space-y-4">
          <button
            onClick={handleAuthRedirect}
            disabled={isDisabled}
            className="w-full h-14 bg-ink text-canvas rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-premium-lg hover:shadow-premium-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>Save & Track Progress</span>
          </button>
          <p className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest text-center px-4 leading-relaxed">
            Login to save reports, track health progress, and download PDF reports.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => handleAction('download')}
            disabled={isExporting || isDisabled}
            className="flex-1 h-14 bg-ink text-canvas rounded-xl font-bold text-xs uppercase tracking-widest shadow-premium-lg hover:shadow-premium-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <RotateCcw className="w-4 h-4" />
              </motion.div>
            ) : (
              <Download className="w-4 h-4 text-canvas/60 group-hover:text-canvas transition-colors" />
            )}
            <span>{isExporting ? 'Downloading...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={() => handleAction('save')}
            disabled={isDisabled}
            className="flex-1 h-14 bg-canvas border border-hairline text-ink rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-canvas-soft transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 text-mute group-hover:text-ink transition-colors" />
            <span>Save to Tracker</span>
          </button>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SaveModal 
        isOpen={isSaveModalOpen} 
        onClose={() => {
          setIsSaveModalOpen(false);
          window.dispatchEvent(new Event('modalClose'));
        }} 
        onSuccess={handleSaveSuccess}
        calculatorType={calculatorType}
        inputData={inputData}
        resultData={resultData}
      />
    </div>
  );
};
