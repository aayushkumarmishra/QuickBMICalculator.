import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const passwordRequirements = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const ResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (data.session) {
          setSessionReady(true);
          setCheckingSession(false);
          return;
        }

        // Try to get session from URL hash (recovery token flow)
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'recovery' && accessToken) {
          const { data: recovered, error: recoverError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (recoverError) throw recoverError;
          if (recovered.session) {
            setSessionReady(true);
          } else {
            setError('Invalid or expired recovery link. Please request a new password reset.');
          }
        } else {
          setError('Invalid reset link. Please request a new password reset.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to verify reset link. Please request a new one.');
      } finally {
        setCheckingSession(false);
      }
    };

    initSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!password) throw new Error('Password cannot be empty');
      if (password.length > 64) throw new Error('Password cannot exceed 64 characters');
      if (password !== confirmPassword) throw new Error('Passwords do not match');

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setMessage('Password updated successfully!');

      // Sign out and redirect to login after a brief delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.replace('/login');
      }, 2000);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Passwords do not match') || msg.includes('Password cannot be empty') || msg.includes('Password cannot exceed 64 characters')) {
        setError(msg);
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-[calc(100vh-68px)] min-[880px]:min-h-screen w-full flex flex-col items-center justify-center bg-canvas">
        <Loader2 className="w-10 h-10 animate-spin text-ink opacity-20" />
        <p className="mt-4 text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Verifying Reset Link</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] min-[880px]:min-h-screen w-full flex flex-col items-center justify-center px-6 py-16 bg-canvas relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(0,223,216,0.06)_0%,transparent_70%)] blur-[100px] sm:blur-[120px] rounded-full"></div>
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[70%] h-[60%] bg-[radial-gradient(circle,rgba(0,112,243,0.04)_0%,transparent_70%)] blur-[120px] sm:blur-[140px] rounded-full"></div>
      </div>

      <div className="w-full max-w-[400px] space-y-8 relative z-10">
        <div className="text-left">
          <h1 className="text-3xl font-extrabold tracking-tighter text-ink mb-2 leading-tight">
            {message ? 'Password Updated' : 'Set New Password'}
          </h1>
          <p className="text-sm text-mute font-medium leading-relaxed">
            {message
              ? 'Redirecting you to login...'
              : sessionReady
                ? 'Enter your new password below.'
                : 'Invalid or expired reset link.'}
          </p>
        </div>

        {message ? (
          <div className="flex flex-col items-center justify-center p-8 bg-status-healthy/5 border border-status-healthy/10 rounded-ui text-center space-y-4 shadow-premium-sm">
            <div className="w-16 h-16 bg-status-healthy/10 rounded-full flex items-center justify-center shadow-premium-sm">
              <CheckCircle2 className="w-8 h-8 text-status-healthy" />
            </div>
            <p className="text-base text-ink font-bold">{message}</p>
          </div>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-ui text-red-600 text-xs font-bold shadow-premium-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-mute uppercase tracking-[0.12em] ml-1">New Password</label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  maxLength={64}
                  autoComplete="new-password"
                  className="w-full h-[52px] pl-12 pr-12 bg-surface border-[1.5px] border-hairline rounded-ui text-sm font-bold text-ink focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-wash transition-all placeholder:text-mute/25 placeholder:font-medium focus-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-mute hover:text-ink transition-colors opacity-40 hover:opacity-100"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {passwordRequirements.map((req, i) => {
                    const isMet = req.test(password);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-300 ${isMet ? 'bg-status-healthy border-status-healthy text-canvas' : 'border-hairline bg-surface'}`}>
                          {isMet ? (
                            <svg className="w-2.5 h-2.5 stroke-[3] text-canvas" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-mute/25" />
                          )}
                        </div>
                        <span className={`text-xs font-semibold transition-colors ${isMet ? 'text-ink' : 'text-mute/60'}`}>
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-mute uppercase tracking-[0.12em] ml-1">Confirm New Password</label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  maxLength={64}
                  autoComplete="new-password"
                  className={`w-full h-[52px] pl-12 pr-12 bg-surface border-[1.5px] ${error === 'Passwords do not match' ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-hairline focus:border-accent focus:ring-accent-wash'} rounded-ui text-sm font-bold text-ink focus:outline-none focus:ring-[3px] transition-all placeholder:text-mute/25 placeholder:font-medium focus-ring`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-mute hover:text-ink transition-colors opacity-40 hover:opacity-100"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error === 'Passwords do not match' && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Passwords do not match</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] bg-ink text-canvas rounded-full font-mono uppercase tracking-[0.2em] text-xs shadow-premium-md hover:shadow-premium-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed focus-ring"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-ui text-red-600 text-xs font-bold shadow-premium-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}
            <a
              href="/forgot-password"
              className="w-full h-[52px] bg-ink text-canvas rounded-full font-mono uppercase tracking-[0.2em] text-xs shadow-premium-md hover:shadow-premium-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3"
            >
              <span>Request New Reset Link</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        <div className="pt-6 border-t border-hairline text-center">
          <p className="text-sm text-mute font-medium leading-relaxed opacity-80">
            Remember your password?{' '}
            <a href="/login" className="text-ink font-bold hover:underline decoration-hairline-strong underline-offset-8 transition-all">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
};
