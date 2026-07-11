import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { logActivity } from '../../lib/audit';

interface AuthFormProps {
  type: 'login' | 'signup' | 'forgot-password' | 'admin-login';
}

const passwordRequirements = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const getSafeRedirect = (url: string | null): string => {
  if (!url) return '/';
  if (!url.startsWith('/')) return '/';
  if (url.startsWith('//')) return '/';
  if (url.includes('://')) return '/';
  return url;
};

const safeMessages = new Set([
  'Passwords do not match',
  'Password cannot be empty',
  'Password cannot exceed 64 characters',
  'Missing required fields',
]);

const sanitizeError = (err: any): string => {
  const msg = err?.message || '';
  if (safeMessages.has(msg)) return msg;
  const lower = msg.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'A user with this email already exists';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please try again later.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password does not meet the minimum requirements';
  }
  return 'An error occurred. Please try again.';
};

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

  const redirectExecuted = React.useRef(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      if (redirectExecuted.current) return;

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && (type === 'login' || type === 'signup' || type === 'admin-login')) {
        // Fetch role to determine landing page
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin') {
          redirectExecuted.current = true;
          window.location.replace('/admin');
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo') || '/';
        const destination = getSafeRedirect(returnTo);
        
        redirectExecuted.current = true;
        window.location.replace(destination);
      }
    };
    checkUser();
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (type === 'signup') {
        if (!password) {
          throw new Error('Password cannot be empty');
        }
        if (password.length > 64) {
          throw new Error('Password cannot exceed 64 characters');
        }
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
        
        // Log successful user registration
        try {
          await logActivity('User Registration', 'user', signUpData.user?.id || null, `New user registered: ${email}`);
        } catch (logErr) {
          console.error('Failed to log user registration:', logErr);
        }
        
        // If email confirmation is required, show success screen
        if (signUpData.user && signUpData.session === null) {
          setIsSubmitted(true);
        } else {
          // Fetch role to redirect correctly
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', signUpData.user?.id || '')
            .single();

          if (profile?.role === 'admin') {
            window.location.replace('/admin');
          } else {
            window.location.replace('/');
          }
        }
      } else if (type === 'login' || type === 'admin-login') {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Log successful user login
        try {
          await logActivity('User Login', 'user', signInData.user?.id || null, `User logged in via email: ${email}`);
        } catch (logErr) {
          console.error('Failed to log user login:', logErr);
        }

        // Fetch profile to check role for redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', signInData.user?.id || '')
          .single();

        const role = profile?.role || 'user';
        const session = signInData.session;

        if (profile?.role === 'admin') {
          if (type === 'admin-login') {
            if (session) {
              document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Strict; Secure`;
              document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=2592000; SameSite=Strict; Secure`;
            }
            document.cookie = `sb-role=admin; path=/; max-age=2592000; SameSite=Strict; Secure`;
            window.location.replace('/admin');
          } else {
            // Admin on regular login page - force user cookie and redirect home
            document.cookie = `sb-role=user; path=/; max-age=0; SameSite=Strict; Secure`;
            document.cookie = `sb-role=; path=/; max-age=0; SameSite=Strict; Secure`;
            window.location.replace('/');
          }
        } else {
          if (session) {
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Strict; Secure`;
            document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=2592000; SameSite=Strict; Secure`;
          }
          document.cookie = `sb-role=${role}; path=/; max-age=2592000; SameSite=Strict; Secure`;
          const params = new URLSearchParams(window.location.search);
          const returnTo = params.get('returnTo') || '/';
          window.location.replace(getSafeRedirect(returnTo));
        }
      } else if (type === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setMessage('Password reset link sent! Please check your email.');
      }
    } catch (err: any) {
      setError(sanitizeError(err));
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
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(sanitizeError(err));
      setLoading(false);
    }
  };

  const title = (type === 'login' || type === 'admin-login') ? 'Welcome back' : type === 'signup' ? 'Create an account' : 'Reset password';
  const subtitle = (type === 'login' || type === 'admin-login')
    ? 'Enter your credentials to access your account.' 
    : type === 'signup' 
    ? 'Join us to track your health journey.' 
    : 'Enter your email to receive a reset link.';

  return (
    <div className="min-h-[calc(100vh-68px)] min-[880px]:min-h-screen w-full flex flex-col min-[880px]:flex-row text-ink relative">
      {/* Shared backdrop: accent glow + grid (same as HeroBackdrop.astro) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(0,223,216,0.06)_0%,transparent_70%)] blur-[100px] sm:blur-[120px] rounded-full dark:opacity-[0.12]"></div>
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[70%] h-[60%] bg-[radial-gradient(circle,rgba(0,112,243,0.04)_0%,transparent_70%)] blur-[120px] sm:blur-[140px] rounded-full dark:opacity-[0.1]"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] max-w-[800px] max-h-[800px] opacity-[0.14] dark:opacity-[0.22]" style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.18]">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(var(--color-mute) 1px, transparent 1px), linear-gradient(90deg, var(--color-mute) 1px, transparent 1px)', backgroundSize: '50px 50px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }}></div>
        </div>
      </div>
      {/* LEFT PANEL: Branded split panel (hidden on mobile, split columns on desktop) */}
      <div className="hidden min-[880px]:flex bg-ink/80 text-canvas dark:bg-surface-2/80 dark:text-ink min-[880px]:border-r border-hairline/10 dark:border-hairline-strong flex-col min-[880px]:justify-between p-16 min-[880px]:w-[40%] min-[880px]:min-h-screen shrink-0">
        {/* Brand Bar */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-canvas dark:bg-ink text-ink dark:text-canvas flex items-center justify-center font-mono font-black text-xl select-none">
            B
          </div>
          <span className="font-bold text-lg tracking-tight select-none">
            QuickBMICalculator
          </span>
        </div>

        {/* Center content (hidden below 880px) */}
        <div className="hidden min-[880px]:flex flex-col my-auto max-w-md gap-8 py-12">
          <h2 className="text-3xl font-extrabold tracking-tight leading-[1.15] text-canvas dark:text-ink">
            {type === 'signup' ? 'Track your health metrics with precision.' : 'Access your personalized health dashboard.'}
          </h2>
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-5 h-5 text-status-healthy mt-0.5 shrink-0" />
              <div className="text-sm font-medium text-canvas/80 dark:text-ink/80 leading-relaxed">
                Save your BMI, BMR, and calorie reports securely.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-5 h-5 text-status-healthy mt-0.5 shrink-0" />
              <div className="text-sm font-medium text-canvas/80 dark:text-ink/80 leading-relaxed">
                Monitor your progress over time with premium charts.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-5 h-5 text-status-healthy mt-0.5 shrink-0" />
              <div className="text-sm font-medium text-canvas/80 dark:text-ink/80 leading-relaxed">
                Export professional, clean PDF reports with a single click.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Form body */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 pt-16 pb-12 min-[880px]:p-16 bg-canvas/80 min-h-full">
        <div className="w-full max-w-[400px] flex flex-col justify-center gap-8">
          {/* Header text */}
          <div className="text-left">
            <h1 className="text-3xl font-extrabold tracking-tighter text-ink mb-2 leading-tight">
              {isSubmitted ? 'Account Created' : title}
            </h1>
            <p className="text-sm text-mute font-medium leading-relaxed">
              {isSubmitted 
                ? 'Please check your email to verify your account.' 
                : subtitle}
            </p>
          </div>

          {isSubmitted ? (
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center p-8 bg-status-healthy/5 border border-status-healthy/10 rounded-ui text-center space-y-4 shadow-premium-sm">
                <div className="w-16 h-16 bg-status-healthy/10 rounded-full flex items-center justify-center shadow-premium-sm">
                  <CheckCircle2 className="w-8 h-8 text-status-healthy" />
                </div>
                <div>
                  <p className="text-base text-ink font-bold mb-1">Verification Email Sent</p>
                  <p className="text-xs text-mute font-medium leading-relaxed">
                    We've sent an activation link to <span className="font-bold text-ink">{email}</span>. <br/>Please verify your inbox to continue.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <a
                  href="/login"
                  className="w-full h-[52px] bg-ink text-canvas rounded-full font-mono uppercase tracking-[0.2em] text-xs shadow-premium-md hover:shadow-premium-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
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
                      setError(sanitizeError(err));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full h-[52px] bg-surface border-[1.5px] border-hairline text-ink rounded-full font-mono uppercase tracking-[0.2em] text-xs hover:bg-canvas-soft hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Resend Email'}
                </button>
              </div>

              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full h-11 flex items-center justify-center text-[10px] font-mono font-bold text-mute hover:text-ink uppercase tracking-[0.2em] transition-colors"
              >
                Back to Signup
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {type !== 'admin-login' && (type === 'login' || type === 'signup') && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-[52px] bg-surface border-[1.5px] border-hairline dark:border-hairline-strong rounded-full flex items-center justify-center gap-4 hover:bg-canvas-soft transition-all duration-300 shadow-premium-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                    <span className="text-sm font-bold text-ink">Continue with Google</span>
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-hairline dark:border-hairline-strong"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] font-mono font-bold uppercase tracking-[0.2em]">
                      <span className="bg-canvas px-4 text-mute">
                        {type === 'login' ? 'or sign in' : 'or register'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && error !== 'Passwords do not match' && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-ui text-red-600 dark:text-red-400 text-xs font-bold shadow-premium-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{error}</span>
                  </div>
                )}

                {message && (
                  <div className="flex items-center gap-3 p-4 bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-ui text-green-600 dark:text-green-500 text-xs font-bold shadow-premium-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{message}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {type === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-xs font-mono font-bold text-mute uppercase tracking-[0.12em] ml-1">Full Name</label>
                      <div className="relative group/input">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full h-[52px] pl-12 pr-4 bg-surface border-[1.5px] border-hairline rounded-ui text-sm font-bold text-ink focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-wash transition-all placeholder:text-mute/25 placeholder:font-medium focus-ring"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-mute uppercase tracking-[0.12em] ml-1">Email Address</label>
                    <div className="relative group/input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        autoComplete="username"
                        name="email"
                        id="email"
                        className="w-full h-[52px] pl-12 pr-4 bg-surface border-[1.5px] border-hairline rounded-ui text-sm font-bold text-ink focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-wash transition-all placeholder:text-mute/25 placeholder:font-medium focus-ring"
                      />
                    </div>
                  </div>

                  {type !== 'forgot-password' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-xs font-mono font-bold text-mute uppercase tracking-[0.12em]">Password</label>
                          {(type === 'login' || type === 'admin-login') && (
                            <a href="/forgot-password" className="text-xs font-mono font-bold text-mute hover:text-ink transition-colors uppercase tracking-[0.1em] opacity-60 hover:opacity-100 p-2 -mr-2 -my-2">Forgot?</a>
                          )}
                        </div>
                        <div className="relative group/input">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            maxLength={type === 'signup' ? 64 : undefined}
                            autoComplete={type === 'signup' ? 'new-password' : 'current-password'}
                            name={type === 'signup' ? 'new-password' : 'password'}
                            id={type === 'signup' ? 'new-password' : 'password'}
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

                        {type === 'signup' && password.length > 0 && (
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

                      {type === 'signup' && (
                        <div className="space-y-2">
                          <label className="text-xs font-mono font-bold text-mute uppercase tracking-[0.12em] ml-1">Confirm Password</label>
                          <div className="relative group/input">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within/input:text-ink transition-colors opacity-40 group-focus-within/input:opacity-100">
                              <Lock className="w-4 h-4" />
                            </div>
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                            maxLength={type === 'signup' ? 64 : undefined}
                            autoComplete="new-password"
                            name="confirm-password"
                            id="confirm-password"
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
                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 dark:text-red-400 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Passwords do not match</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
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
                        <span>{(type === 'login' || type === 'admin-login') ? 'Sign In' : type === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {!isSubmitted && (
                <div className="pt-6 border-t border-hairline text-center">
                  {(type === 'login' || type === 'admin-login') ? (
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
          )}
        </div>
      </div>
    </div>
  );
};
