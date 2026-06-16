import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AuthFormProps {
  type: 'login' | 'signup' | 'forgot-password';
}

const passwordRequirements = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && (type === 'login' || type === 'signup')) {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo') || '/';
        window.location.href = returnTo;
      }
    };
    checkUser();
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') || '/';

    try {
      if (type === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (signUpError) throw signUpError;
        
        // If email confirmation is required, show success screen
        if (signUpData.user && signUpData.session === null) {
          setIsSubmitted(true);
        } else {
          // If auto-logged in or confirmation not required
          window.location.href = returnTo;
        }
      } else if (type === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = returnTo;
      } else if (type === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (resetError) throw resetError;
        setMessage('Password reset link sent! Please check your email.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/tracker`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'An error occurred with Google login');
      setLoading(false);
    }
  };

  const title = type === 'login' ? 'Welcome back' : type === 'signup' ? 'Create an account' : 'Reset password';
  const subtitle = type === 'login' 
    ? 'Enter your credentials to access your account.' 
    : type === 'signup' 
    ? 'Join us to track your health journey.' 
    : 'Enter your email to receive a reset link.';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-canvas border border-hairline rounded-[2rem] p-10 sm:p-12 shadow-premium-2xl relative overflow-hidden group/card transition-all duration-500 hover:border-hairline-strong">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 opacity-50 group-hover/card:opacity-100 transition-opacity duration-700">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[radial-gradient(circle,rgba(23,23,23,0.03)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)] blur-[60px] rounded-full"></div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-ink mb-3 leading-tight">
            {isSubmitted ? 'Account Created Successfully' : title}
          </h1>
          <p className="text-sm text-mute font-medium leading-relaxed max-w-[280px] mx-auto opacity-80">
            {isSubmitted 
              ? 'Please check your email to verify your account before logging in.' 
              : subtitle}
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center justify-center p-10 bg-green-50/50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 rounded-[2rem] text-center space-y-4 shadow-inner">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center shadow-premium-sm">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <p className="text-base text-green-800 dark:text-green-400 font-bold mb-1">Verification Email Sent</p>
                <p className="text-xs text-green-600/80 dark:text-green-500/60 font-medium leading-relaxed">We've sent a link to <span className="font-bold text-green-700 dark:text-green-400">{email}</span>. <br/>Click it to activate your account.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <a
                href="/login"
                className="w-full h-15 bg-ink text-canvas rounded-full font-black text-xs uppercase tracking-[0.25em] shadow-premium-lg hover:shadow-premium-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                <span>Go to Login</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: email,
                    });
                    if (error) throw error;
                    setMessage('Verification email resent!');
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full h-15 bg-canvas border border-hairline text-ink rounded-full font-black text-xs uppercase tracking-[0.2em] hover:bg-canvas-soft transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Resend Email'}
              </button>
            </div>

            <button
              onClick={() => setIsSubmitted(false)}
              className="w-full text-[10px] font-mono font-bold text-mute hover:text-ink uppercase tracking-[0.2em] transition-colors"
            >
              Back to Signup
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {(type === 'login' || type === 'signup') && (
              <div className="space-y-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-15 bg-canvas border border-hairline rounded-2xl flex items-center justify-center gap-4 hover:bg-canvas-soft hover:border-hairline-strong transition-all duration-500 shadow-premium-sm hover:shadow-premium-md group active:scale-[0.98] disabled:opacity-50 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-ink/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <svg className="w-5 h-5 transition-transform duration-500 group-hover:scale-110 relative z-10" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-sm font-bold text-ink relative z-10">Continue with Google</span>
                </button>

                <p className="text-[11px] text-center text-mute/60 font-medium px-4 leading-relaxed italic">
                  If you've used this email before, Google Sign-In will continue to your existing account.
                </p>

                <div className="relative pt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-hairline"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-mono font-bold uppercase tracking-[0.2em]">
                    <span className="bg-canvas px-4 text-mute opacity-60">
                      {type === 'login' ? 'or sign in with email' : 'or continue with email'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 p-5 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold shadow-premium-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{error}</span>
                </motion.div>
              )}

            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-3 p-5 bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 rounded-2xl text-green-600 dark:text-green-400 text-xs font-bold shadow-premium-sm"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{message}</span>
              </motion.div>
            )}

            <div className="space-y-6">
              {type === 'signup' && (
                <div className="space-y-2.5">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.25em] ml-1 opacity-70">Full Name</label>
                  <div className="relative group/input">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full h-15 pl-14 pr-6 bg-canvas-soft border border-hairline rounded-[1rem] text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all placeholder:text-mute/25 placeholder:font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.25em] ml-1 opacity-70">Email Address</label>
                <div className="relative group/input">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-15 pl-14 pr-6 bg-canvas-soft border border-hairline rounded-[1rem] text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all placeholder:text-mute/25 placeholder:font-medium"
                  />
                </div>
              </div>

              {type !== 'forgot-password' && (
                <>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.25em] opacity-70">Password</label>
                      {type === 'login' && (
                        <a href="/forgot-password" className="text-[10px] font-mono font-bold text-mute hover:text-ink transition-colors uppercase tracking-[0.1em] opacity-60 hover:opacity-100">Forgot?</a>
                      )}
                    </div>
                    <div className="relative group/input">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-15 pl-14 pr-14 bg-canvas-soft border border-hairline rounded-[1rem] text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all placeholder:text-mute/25 placeholder:font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition-colors opacity-40 hover:opacity-100"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {type === 'signup' && password.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 p-5 bg-canvas-soft border border-hairline rounded-[1.5rem] animate-in fade-in slide-in-from-top-2 duration-300">
                        {passwordRequirements.map((req, i) => {
                          const isMet = req.test(password);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${isMet ? 'bg-green-100 dark:bg-green-500/20' : 'bg-mute/10'}`}>
                                {isMet && <CheckCircle2 className="w-2.5 h-2.5 text-green-600 dark:text-green-500" />}
                              </div>
                              <span className={`text-[10px] font-bold transition-colors ${isMet ? 'text-green-600 dark:text-green-500' : 'text-mute opacity-60'}`}>
                                {req.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {type === 'signup' && (
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.25em] ml-1 opacity-70">Confirm Password</label>
                      <div className="relative group/input">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-15 pl-14 pr-14 bg-canvas-soft border border-hairline rounded-[1rem] text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-ink/5 focus:border-ink transition-all placeholder:text-mute/25 placeholder:font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition-colors opacity-40 hover:opacity-100"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-15 bg-ink text-canvas rounded-full font-black text-xs uppercase tracking-[0.25em] shadow-premium-xl hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all active:scale-[0.97] flex items-center justify-center gap-4 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{type === 'login' ? 'Sign In' : type === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

        {!isSubmitted && (
          <div className="mt-12 pt-8 border-t border-hairline text-center">
            {type === 'login' ? (
              <p className="text-sm text-mute font-medium leading-relaxed opacity-80">
                Don't have an account?{' '}
                <a href="/signup" className="text-ink font-bold hover:underline decoration-hairline-strong underline-offset-8 transition-all">Sign up for free</a>
              </p>
            ) : (
              <p className="text-sm text-mute font-medium leading-relaxed opacity-80">
                Already have an account?{' '}
                <a href="/login" className="text-ink font-bold hover:underline decoration-hairline-strong underline-offset-8 transition-all">Sign in here</a>
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
