import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  MapPin,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export default function AuthPage({ onAuthSuccess, onBack, initialMode = 'login' }) {
  const navigate = useNavigate();
  const { login, signup, resetPassword, pendingInviteCode, emailConfirmationRequired } = useAuth();

  const [mode, setMode] = useState(() => pendingInviteCode ? 'signup' : initialMode); // 'login' | 'signup' | 'forgot'
  const [invitePreview, setInvitePreview] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Video state for the crowd video
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener('canplay', playVideo, { once: true });
      video.addEventListener('loadeddata', playVideo, { once: true });
    }
  }, []);

  // Fetch event preview when landing via invite link
  useEffect(() => {
    if (!pendingInviteCode) {
      setInvitePreview(null);
      return;
    }
    const clean = pendingInviteCode.trim().toUpperCase();
    api.previewInvite(clean)
      .then(res => {
        const ev = res?.event || res;
        if (ev?.title) setInvitePreview(ev);
      })
      .catch(err => {
        console.warn('Invite preview check notice:', err.message);
      });
  }, [pendingInviteCode]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleBackToHome = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'signup' && password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'signup' && confirmPassword && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        onAuthSuccess?.();
      } else if (mode === 'signup') {
        const res = await signup({
          fullName: fullName.trim(),
          email: email.trim(),
          password
        });
        if (res?.requiresEmailConfirmation) {
          setSuccessMsg('Verification email sent. Please confirm your email address.');
        } else {
          onAuthSuccess?.();
        }
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setSuccessMsg('Password reset instructions sent to your email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B071E] text-white selection:bg-[#D4F728] selection:text-slate-950 font-sans relative overflow-x-hidden">
      {/* 
        LEFT COLUMN (50% on desktop): 
        High-energy crowd video with stage lights, bold typography, and playback controls
      */}
      <div className="relative w-full lg:w-1/2 min-h-[380px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden shrink-0">
        {/* Crowd Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover object-center filter brightness-90 contrast-110"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          >
            <source src="/11832-233049403_medium.mp4" type="video/mp4" />
            <source src="/videos/11832-233049403_medium.mp4" type="video/mp4" />
            <source src="/Landing.mp4" type="video/mp4" />
          </video>

          {/* Vignette Gradients for contrast and mood */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/75 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(112,84,232,0.25)_0%,transparent_60%)] pointer-events-none" />
        </div>

        {/* Top Header of Left Column */}
        <div className="relative z-10 flex flex-col items-start gap-3">
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.25em] text-slate-400 uppercase">
            {mode === 'login' ? '01 / LOG IN' : '02 / SIGN UP'}
          </span>

          <Link to="/" className="inline-block group">
            <span className="font-black italic text-3xl sm:text-4xl tracking-tighter text-[#D4F728] drop-shadow-[0_0_15px_rgba(212,247,40,0.5)] transition-transform group-hover:scale-105">
              RALLY
            </span>
          </Link>

          <button
            type="button"
            onClick={handleBackToHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer mt-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </button>
        </div>

        {/* Center Display Headline of Left Column */}
        <div className="relative z-10 my-8 sm:my-auto max-w-lg">
          {mode === 'login' ? (
            <>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase font-display leading-[0.92] tracking-tight">
                <span className="block text-white">THE CROWD.</span>
                <span className="block text-white">THE CREW.</span>
                <span className="block text-[#D4F728] text-glow-lime">YOU.</span>
              </h1>
              <p className="text-xs sm:text-base text-slate-200 font-medium mt-4 max-w-md leading-relaxed drop-shadow-md">
                Your next great event starts with your people.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase font-display leading-[0.92] tracking-tight">
                <span className="block text-white">GREAT EVENTS.</span>
                <span className="block text-[#D4F728] text-glow-lime">START WITH YOU.</span>
              </h1>
              <p className="text-xs sm:text-base text-slate-200 font-medium mt-4 max-w-md leading-relaxed drop-shadow-md">
                Create an account. Find your crew. Make it happen.
              </p>
            </>
          )}
        </div>

        {/* Bottom Bar of Left Column */}
        <div className="relative z-10 flex items-center gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 border border-white/25 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg shrink-0"
            title={isPlaying ? 'Pause crowd video' : 'Play crowd video'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-[#D4F728]" />
            )}
          </button>

          <span className="text-xs text-slate-300 font-medium">
            Built for the people{' '}
            <span className="text-[#D4F728] font-bold">behind the event.</span>
          </span>
        </div>
      </div>

      {/* 
        RIGHT COLUMN (50% on desktop): 
        Sleek, razor-sharp auth form matching user's Image 2 reference
      */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#0B071E] relative z-10 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Pending Invitation Notification */}
          {pendingInviteCode && (
            <div className="p-4 rounded-2xl bg-[#140E2C] border border-[#D4F728]/40 backdrop-blur-md flex items-start gap-3.5 text-xs text-slate-200 shadow-xl">
              <div className="w-8 h-8 rounded-xl bg-[#D4F728]/15 border border-[#D4F728]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#D4F728]">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-extrabold block text-white text-sm">
                  {invitePreview?.title ? `Join ${invitePreview.title}` : 'Team Invitation Active'}
                </span>
                {invitePreview?.venueName && (
                  <span className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#D4F728] shrink-0" />
                    <span>{invitePreview.venueName}</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-400 block mt-1">
                  Invite code{' '}
                  <span className="font-mono font-bold text-[#D4F728]">
                    {pendingInviteCode}
                  </span>{' '}
                  • Auto-enrolling as Volunteer
                </span>
              </div>
            </div>
          )}

          {/* Email Confirmation Notice */}
          {emailConfirmationRequired && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Email Confirmation Required</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                We sent a verification link to your email address. Please click the link in your
                inbox to complete verification.
              </p>
            </div>
          )}

          {/* Form Header */}
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400 block mb-2">
              {mode === 'login'
                ? 'WELCOME BACK'
                : mode === 'signup'
                ? 'JOIN RALLY'
                : 'RESET PASSWORD'}
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {mode === 'login'
                ? 'Your crew is waiting.'
                : mode === 'signup'
                ? 'Be part of what happens.'
                : 'Recover your account.'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              {mode === 'login'
                ? 'Log in to manage your events and volunteer shifts.'
                : mode === 'signup'
                ? 'One account. Every event you help bring to life.'
                : 'Enter your email address to receive password reset instructions.'}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Sign Up only) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl bg-[#140E2C] border border-white/15 focus:border-[#D4F728] focus:bg-[#181135] text-white text-xs sm:text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner"
                />
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-[#140E2C] border border-white/15 focus:border-[#D4F728] focus:bg-[#181135] text-white text-xs sm:text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner"
              />
            </div>

            {/* Password (Login and Sign Up) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
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
                      className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#140E2C] border border-white/15 focus:border-[#D4F728] focus:bg-[#181135] text-white text-xs sm:text-sm outline-none transition-all placeholder:text-slate-500 tracking-wider shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {mode === 'signup' && (
                  <span className="text-[11px] text-slate-400 mt-1.5 block">
                    Use at least 8 characters.
                  </span>
                )}
              </div>
            )}

            {/* Confirm Password (Sign Up only) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#140E2C] border border-white/15 focus:border-[#D4F728] focus:bg-[#181135] text-white text-xs sm:text-sm outline-none transition-all placeholder:text-slate-500 tracking-wider shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Button (with SVG Arrow, strictly NO emojis) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm tracking-tight text-slate-950 bg-[#D4F728] hover:bg-[#c8ee20] box-glow-lime flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xl"
              >
                <span>
                  {submitting
                    ? 'Processing...'
                    : mode === 'login'
                    ? 'Log in'
                    : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset instructions'}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {mode === 'signup' && (
                <p className="text-[11px] text-slate-400 text-center mt-2.5 leading-relaxed">
                  Create an event to organize, or join with an invite to volunteer.
                </p>
              )}
            </div>
          </form>

          {/* Toggle between Login and Sign Up */}
          <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400">
            {mode === 'login' && (
              <p>
                New to RALLY?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-bold text-[#D4F728] hover:underline ml-1 cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-bold text-[#D4F728] hover:underline ml-1 cursor-pointer"
                >
                  Log in
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-bold text-[#D4F728] hover:underline ml-1 cursor-pointer"
                >
                  Back to Log in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
