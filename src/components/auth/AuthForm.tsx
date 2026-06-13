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
        window.location.href = '/';
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
          window.location.href = '/';
        }
      } else if (type === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = '/';
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

  const title = type === 'login' ? 'Welcome back.' : type === 'signup' ? 'Create an account.' : 'Reset password.';
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
      <div className="bg-canvas border border-hairline rounded-[2rem] p-8 sm:p-12 shadow-premium-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[radial-gradient(circle,rgba(23,23,23,0.03)_0%,transparent_70%)] blur-[60px] rounded-full"></div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tighter text-ink mb-3">
            {isSubmitted ? 'Account Created Successfully.' : title}
          </h1>
          <p className="text-sm text-mute font-medium leading-relaxed">
            {isSubmitted 
              ? 'Please check your email to verify your account before logging in.' 
              : subtitle}
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-8 bg-green-50/50 border border-green-100 rounded-3xl text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-green-800 font-bold mb-2">Verification Email Sent</p>
              <p className="text-xs text-green-600 font-medium">We've sent a link to <span className="font-bold">{email}</span>. Click it to activate your account.</p>
            </div>
            <a
              href="/login"
              className="w-full h-14 bg-ink text-canvas rounded-pill font-black text-xs uppercase tracking-[0.2em] shadow-premium-lg hover:shadow-premium-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
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
              className="w-full h-14 bg-canvas border border-hairline text-ink rounded-pill font-black text-xs uppercase tracking-[0.2em] hover:bg-canvas-soft transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Resend Verification Email'}
            </button>
            <button
              onClick={() => setIsSubmitted(false)}
              className="w-full text-xs font-mono font-bold text-mute hover:text-ink uppercase tracking-widest transition-colors"
            >
              Back to Signup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div className="space-y-4">
              {type === 'signup' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within:text-ink transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full h-14 pl-12 pr-5 bg-canvas-soft border border-hairline rounded-ui text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-ink transition-all placeholder:text-mute/30"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within:text-ink transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-14 pl-12 pr-5 bg-canvas-soft border border-hairline rounded-ui text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-ink transition-all placeholder:text-mute/30"
                  />
                </div>
              </div>

              {type !== 'forgot-password' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em]">Password</label>
                      {type === 'login' && (
                        <a href="/forgot-password" className="text-[10px] font-mono font-bold text-mute hover:text-ink transition-colors uppercase tracking-[0.1em]">Forgot?</a>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within:text-ink transition-colors">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-14 pl-12 pr-12 bg-canvas-soft border border-hairline rounded-ui text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-ink transition-all placeholder:text-mute/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {type === 'signup' && password.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-canvas-soft border border-hairline rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                        {passwordRequirements.map((req, i) => {
                          const isMet = req.test(password);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${isMet ? 'bg-green-100' : 'bg-mute/10'}`}>
                                {isMet && <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />}
                              </div>
                              <span className={`text-[10px] font-bold transition-colors ${isMet ? 'text-green-600' : 'text-mute'}`}>
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
                      <label className="text-[10px] font-mono font-bold text-mute uppercase tracking-[0.2em] ml-1">Confirm Password</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mute group-focus-within:text-ink transition-colors">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-14 pl-12 pr-12 bg-canvas-soft border border-hairline rounded-ui text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-ink transition-all placeholder:text-mute/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-ink text-canvas rounded-pill font-black text-xs uppercase tracking-[0.2em] shadow-premium-lg hover:shadow-premium-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{type === 'login' ? 'Sign In' : type === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}

        {!isSubmitted && (
          <div className="mt-10 pt-8 border-t border-hairline text-center">
            {type === 'login' ? (
              <p className="text-sm text-mute font-medium">
                Don't have an account?{' '}
                <a href="/signup" className="text-ink font-bold hover:underline decoration-hairline-strong underline-offset-4">Sign up for free</a>
              </p>
            ) : (
              <p className="text-sm text-mute font-medium">
                Already have an account?{' '}
                <a href="/login" className="text-ink font-bold hover:underline decoration-hairline-strong underline-offset-4">Sign in here</a>
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
