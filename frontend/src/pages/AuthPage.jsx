import React, { useState } from 'react';
import { Mail, Lock, User, Phone, ArrowRight, Sparkles, CheckCircle2, AlertCircle, KeyRound, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function AuthPage({ onAuthSuccess }) {
  const { login, signup, resetPassword, pendingInviteCode, emailConfirmationRequired } = useAuth();
  const { isNight, toggleTheme } = useTheme();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        onAuthSuccess?.();
      } else if (mode === 'signup') {
        const res = await signup({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim()
        });
        if (res?.requiresEmailConfirmation) {
          setSuccessMsg('Verification email dispatched. Please confirm your email address.');
        } else {
          onAuthSuccess?.();
        }
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setSuccessMsg('Password reset link sent to your email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Top Bar Branding */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-editorial text-2xl font-bold shadow-sm"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            R
          </div>
          <div>
            <span
              className="font-editorial text-xl font-bold tracking-tight"
              style={{ color: 'var(--text-heading)' }}
            >
              RALLY
            </span>
            <span className="text-[10px] text-slate-400 block tracking-widest font-mono uppercase">
              Operations Platform
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-2xs"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-heading)'
          }}
        >
          {isNight ? '🌙 Night mode' : '☀️ Day mode'}
        </button>
      </div>

      {/* Main Auth Card */}
      <div
        className="w-full max-w-md rounded-3xl border shadow-xl p-6 sm:p-8 space-y-6 transition-colors relative mt-12 sm:mt-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {/* Pending Invitation Notification */}
        {pendingInviteCode && (
          <div
            className="p-3 rounded-2xl border flex items-center gap-3 text-xs"
            style={{
              backgroundColor: 'var(--lilac-subtle)',
              borderColor: 'var(--lilac-accent)',
              color: 'var(--text-heading)'
            }}
          >
            <KeyRound className="w-5 h-5 text-[#7054E8] shrink-0" />
            <div className="min-w-0">
              <span className="font-bold block">Event Invitation Active</span>
              <span className="text-[11px] text-slate-500">
                Code <span className="font-mono font-bold text-[#7054E8]">{pendingInviteCode}</span> will be attached upon sign in.
              </span>
            </div>
          </div>
        )}

        {/* Email Confirmation Notice */}
        {emailConfirmationRequired && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Email Confirmation Required</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              We sent a verification link to your email address. Please click the link in your inbox to complete verification and sign in.
            </p>
          </div>
        )}

        {/* Title & Tabs */}
        <div>
          <h1
            className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: 'var(--text-heading)' }}
          >
            {mode === 'login' ? 'Welcome back.' : mode === 'signup' ? 'Join RALLY.' : 'Reset password.'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login'
              ? 'Enter your credentials to access your event dashboard.'
              : mode === 'signup'
              ? 'Create your verified account to organize or volunteer.'
              : 'Enter your email address to receive password reset instructions.'}
          </p>
        </div>

        {/* Form Error or Success */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label
                className="text-xs font-bold block mb-1.5"
                style={{ color: 'var(--text-heading)' }}
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden transition-all"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-heading)'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label
              className="text-xs font-bold block mb-1.5"
              style={{ color: 'var(--text-heading)' }}
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label
                className="text-xs font-bold block mb-1.5"
                style={{ color: 'var(--text-heading)' }}
              >
                Phone Number <span className="text-[10px] text-slate-400 font-normal">(Optional for SMS alerts)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden transition-all"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-heading)'
                  }}
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-xs font-bold"
                  style={{ color: 'var(--text-heading)' }}
                >
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden transition-all"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-heading)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            <span>
              {submitting
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign in to RALLY'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Reset Link'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div
          className="pt-4 border-t text-center text-xs"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {mode === 'login' ? (
            <p className="text-slate-500">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold underline ml-1"
                style={{ color: 'var(--text-heading)' }}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold underline ml-1"
                style={{ color: 'var(--text-heading)' }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
