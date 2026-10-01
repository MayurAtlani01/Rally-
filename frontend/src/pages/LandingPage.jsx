import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  MapPin,
  Sparkles,
  ShieldCheck,
  Users,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  RotateCcw,
  Compass,
  AlertTriangle,
  Radio,
  Clock,
  LogOut,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LandingPage({ onOpenCreateEvent, onOpenJoinEvent, onLogin }) {
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const { currentUser, logout } = auth;

  // Video state for Hero Background
  const [heroVideoSrc, setHeroVideoSrc] = useState('/Landing.mp4');
  const [heroIsPlaying, setHeroIsPlaying] = useState(true);
  const [heroIsMuted, setHeroIsMuted] = useState(true);
  const heroVideoRef = useRef(null);

  // Video state for Showcase Section (Second video)
  const [showcaseVideoSrc, setShowcaseVideoSrc] = useState('/11832-233049403_medium.mp4');
  const [showcaseIsPlaying, setShowcaseIsPlaying] = useState(true);
  const [showcaseIsMuted, setShowcaseIsMuted] = useState(true);
  const showcaseVideoRef = useRef(null);

  // Sticky header state when scrolled past hero
  const [isScrolled, setIsScrolled] = useState(false);

  // Venue map interactive preview states
  const [activeZonePin, setActiveZonePin] = useState('stage-a');
  const [coverageLens, setCoverageLens] = useState('attendance'); // 'attendance' | 'schedule'

  // Role feature tabs
  const [activeRoleTab, setActiveRoleTab] = useState('organizers'); // 'organizers' | 'volunteers' | 'safety'

  // Zone pins data matching the festival isometric map
  const zonePins = [
    {
      id: 'stage-a',
      name: 'Main Stage (Stage A)',
      x: '72%',
      y: '30%',
      type: 'Stage',
      headcount: '14/14 Staffed',
      status: 'Optimal (100%)',
      lead: 'Sarah Connor',
      nextHandover: '14:30',
      description: 'Front of house barriers, backstage access control, artist escort.'
    },
    {
      id: 'tent-b',
      name: 'West Marquee Tents',
      x: '52%',
      y: '43%',
      type: 'Zone',
      headcount: '6/6 Staffed',
      status: 'Optimal (100%)',
      lead: 'Marcus Brody',
      nextHandover: '15:00',
      description: 'Acoustic tent seating, wristband verification, ADA assistance.'
    },
    {
      id: 'plaza',
      name: 'Central Concourse & Merch',
      x: '64%',
      y: '53%',
      type: 'Concession',
      headcount: '8/8 Staffed',
      status: 'Optimal (100%)',
      lead: 'Elena Vance',
      nextHandover: '16:00',
      description: 'Merchandise queues, sponsor pavilion, roaming information volunteers.'
    },
    {
      id: 'entrance',
      name: 'South Turnstiles & VIP',
      x: '83%',
      y: '60%',
      type: 'Access Gate',
      headcount: '10/12 Staffed',
      status: 'Peak Surge (2 Needed)',
      lead: 'Devon Miller',
      nextHandover: '14:00',
      description: 'Bag search line, mobile barcode scanners, VIP credentials lane.'
    },
    {
      id: 'medical',
      name: 'First Aid & Safety Base',
      x: '43%',
      y: '62%',
      type: 'Emergency',
      headcount: '4/4 Staffed',
      status: 'Priority Ready',
      lead: 'Dr. Rachel Adams',
      nextHandover: '18:00',
      description: 'Paramedic triage station, water distribution hub, rapid response radio.'
    },
    {
      id: 'east-tents',
      name: 'East Festival Hub',
      x: '34%',
      y: '48%',
      type: 'Hospitality',
      headcount: '5/5 Staffed',
      status: 'Optimal (100%)',
      lead: 'Tariq Hussain',
      nextHandover: '15:30',
      description: 'Crew catering lounge, radio charging depot, volunteer check-in terminal.'
    }
  ];

  const activeZoneData = zonePins.find((p) => p.id === activeZonePin) || zonePins[0];

  // Robust Hero Video Autoplay Execution
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      const promise = video.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            setHeroIsPlaying(true);
          })
          .catch((err) => {
            console.log('Hero video autoplay waiting for user interaction:', err);
          });
      }
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener('canplay', playVideo, { once: true });
      video.addEventListener('loadeddata', playVideo, { once: true });
    }
  }, [heroVideoSrc]);

  // Robust Showcase Video Autoplay Execution
  useEffect(() => {
    const video = showcaseVideoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      const promise = video.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            setShowcaseIsPlaying(true);
          })
          .catch(() => {});
      }
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener('canplay', playVideo, { once: true });
      video.addEventListener('loadeddata', playVideo, { once: true });
    }
  }, [showcaseVideoSrc]);

  // Track scroll position for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hero video play/pause toggle
  const toggleHeroPlay = () => {
    if (!heroVideoRef.current) return;
    if (heroIsPlaying) {
      heroVideoRef.current.pause();
      setHeroIsPlaying(false);
    } else {
      heroVideoRef.current.play().catch(() => {});
      setHeroIsPlaying(true);
    }
  };

  // Hero video audio toggle
  const toggleHeroMute = () => {
    if (!heroVideoRef.current) return;
    heroVideoRef.current.muted = !heroIsMuted;
    setHeroIsMuted(!heroIsMuted);
  };

  // Switch hero video feed
  const switchHeroVideo = () => {
    const next =
      heroVideoSrc.includes('Landing')
        ? '/11832-233049403_medium.mp4'
        : '/Landing.mp4';
    setHeroVideoSrc(next);
  };

  // Showcase video play/pause toggle
  const toggleShowcasePlay = () => {
    if (!showcaseVideoRef.current) return;
    if (showcaseIsPlaying) {
      showcaseVideoRef.current.pause();
      setShowcaseIsPlaying(false);
    } else {
      showcaseVideoRef.current.play().catch(() => {});
      setShowcaseIsPlaying(true);
    }
  };

  // Showcase video audio toggle
  const toggleShowcaseMute = () => {
    if (!showcaseVideoRef.current) return;
    showcaseVideoRef.current.muted = !showcaseIsMuted;
    setShowcaseIsMuted(!showcaseIsMuted);
  };

  // Smooth scroll helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreateEventClick = () => {
    if (currentUser) {
      navigate('/setup');
    } else if (onOpenCreateEvent) {
      onOpenCreateEvent();
    } else {
      navigate('/overview');
    }
  };

  const handleJoinEventClick = () => {
    if (onOpenJoinEvent) {
      onOpenJoinEvent();
    } else {
      navigate('/volunteer/today');
    }
  };

  const handleLoginClick = () => {
    if (currentUser) {
      navigate('/overview');
    } else if (onLogin) {
      onLogin();
    } else if (onOpenCreateEvent) {
      onOpenCreateEvent();
    }
  };

  return (
    <div className="min-h-screen bg-[#070514] text-white selection:bg-[#D4F728] selection:text-slate-950 font-sans relative">
      {/* Sticky Header that fades in smoothly when scrolled down past hero */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-[#070514]/90 backdrop-blur-xl border-b border-white/10 transition-all duration-300 ${
          isScrolled
            ? 'opacity-100 translate-y-0 pointer-events-auto shadow-2xl'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-black italic text-2xl tracking-tighter text-[#D4F728] drop-shadow-[0_0_15px_rgba(212,247,40,0.5)]">
              RALLY
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('venue-map')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Explore the map
            </button>
            <button
              onClick={() => scrollToSection('live-pulse')}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live radar</span>
            </button>
            <button
              onClick={() => scrollToSection('volunteers')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              For volunteers
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {currentUser && (
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Log out of RALLY"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            )}
            <button
              onClick={handleCreateEventClick}
              className="px-4 py-2 rounded-xl bg-[#D4F728] hover:bg-[#c6ea21] text-slate-950 font-black text-xs tracking-tight shadow-[0_0_20px_rgba(212,247,40,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>Create event</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* 
        HERO SECTION:
        Strictly fits in 100vh / 100dvh (100% IN FRAME without any scrolling within the hero)
        Matches user's reference image pixel for pixel.
      */}
      <section className="relative w-full h-screen max-h-[100dvh] min-h-[580px] flex flex-col justify-between overflow-hidden bg-[#070514]">
        {/* Background Video Layer - Visible at z-0 with bright neon vibrancy */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <video
            ref={heroVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover object-center scale-100"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          >
            <source src={heroVideoSrc} type="video/mp4" />
            <source src="/Landing.mp4" type="video/mp4" />
            <source src="/videos/Landing.mp4" type="video/mp4" />
          </video>

          {/* Light Overlays - Very transparent so the radiant neon light tunnel is vivid */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#070514] via-[#070514]/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-black/15 pointer-events-none" />
        </div>

        {/* 1. TOP NAVBAR (Inside hero frame, perfectly visible at top edge) */}
        <header className="w-full max-w-7xl mx-auto px-6 pt-5 pb-2 flex items-center justify-between z-20 shrink-0">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-black italic text-2xl sm:text-3xl tracking-tighter text-[#D4F728] drop-shadow-[0_0_15px_rgba(212,247,40,0.5)] transition-transform group-hover:scale-105">
              RALLY
            </span>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('venue-map')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Explore the map
            </button>
            <button
              onClick={() => scrollToSection('volunteers')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              For volunteers
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/overview"
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 transition-all flex items-center gap-1.5"
                >
                  <span>Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4F728]" />
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white text-xs sm:text-sm font-bold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Sign out of RALLY"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="text-xs sm:text-sm font-medium text-slate-200 hover:text-white px-2 py-1 transition-colors cursor-pointer"
              >
                Log in
              </button>
            )}

            <button
              onClick={handleCreateEventClick}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[#D4F728] hover:bg-[#c6ea21] text-slate-950 font-black text-xs sm:text-sm tracking-tight shadow-[0_0_25px_rgba(212,247,40,0.35)] transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Create event</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </header>

        {/* 2. CENTER CONTENT (Centered vertically in available space) */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 max-w-4xl mx-auto my-auto shrink-0 py-2">
          {/* Eyebrow Label matching user reference */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-slate-200 mb-3 sm:mb-4 shadow-lg">
            <span>Event &amp; Volunteer Coordination</span>
          </div>

          {/* Giant Punchy Headline matching user reference */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[4.75rem] font-black tracking-tight leading-[0.98] uppercase font-display max-w-3xl">
            <span className="block text-white">BIG EVENTS.</span>
            <span className="block text-[#D4F728] text-glow-lime mt-1">
              BETTER TOGETHER.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-base md:text-lg text-slate-200 font-medium max-w-xl mt-3 sm:mt-4 leading-relaxed drop-shadow-md">
            Bring your crew, shifts and venue into one shared space.
          </p>

          {/* Two Primary Action Buttons */}
          <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={handleCreateEventClick}
              className="px-6 sm:px-8 py-3 rounded-xl bg-[#D4F728] hover:bg-[#c8ee20] text-slate-950 font-black text-xs sm:text-sm tracking-tight box-glow-lime transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Organize an event</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={handleJoinEventClick}
              className="px-6 sm:px-8 py-3 rounded-xl bg-slate-950/60 hover:bg-slate-900/80 text-white font-bold text-xs sm:text-sm border border-white/25 backdrop-blur-md transition-all hover:border-white/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xl"
            >
              <KeyRound className="w-4 h-4 text-[#D4F728]" />
              <span>Join as a volunteer</span>
            </button>
          </div>

          {/* Demo Event Link */}
          <div className="mt-2.5">
            <Link
              to="/overview"
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 hover:text-[#D4F728] transition-colors"
            >
              <span>Explore live demo event (Ignite Fest 2026)</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 3. BOTTOM BAR (Controls & Scroll indicator inside hero frame) */}
        <div className="w-full max-w-7xl mx-auto px-6 pb-4 sm:pb-6 flex items-center justify-between z-20 shrink-0">
          {/* Left: Feed Switcher */}
          <div className="w-28 sm:w-36 flex items-center">
            <button
              onClick={switchHeroVideo}
              className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/15 text-[10px] font-mono font-bold text-slate-300 hover:text-white backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Toggle Stage Tunnel / Festival Crowd video feed"
            >
              <Radio className="w-3 h-3 text-[#D4F728]" />
              <span>
                Feed:{' '}
                {heroVideoSrc.includes('Landing') ? 'Stage' : 'Crowd'}
              </span>
            </button>
          </div>

          {/* Center: Scroll to explore */}
          <button
            onClick={() => scrollToSection('venue-map')}
            className="flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="w-[1px] h-4 bg-white/50 group-hover:bg-[#D4F728] transition-colors animate-bounce" />
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-slate-300">
              Scroll to explore
            </span>
          </button>

          {/* Right: Round Play/Pause and Mute Controls */}
          <div className="w-28 sm:w-36 flex items-center justify-end gap-2">
            <button
              onClick={toggleHeroMute}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-lg"
              title={heroIsMuted ? 'Unmute video audio' : 'Mute video audio'}
            >
              {heroIsMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-slate-300" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#D4F728]" />
              )}
            </button>

            <button
              onClick={toggleHeroPlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-lg"
              title={heroIsPlaying ? 'Pause video' : 'Play video'}
            >
              {heroIsPlaying ? (
                <Pause className="w-4 h-4 fill-current text-white" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5 text-[#D4F728]" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: VENUE MAP PREVIEW matching bottom half of user screenshot */}
      <section
        id="venue-map"
        className="relative py-20 sm:py-28 px-6 border-t border-white/10 bg-gradient-to-b from-[#070514] via-[#0B081E] to-[#070514]"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[#D4F728] block mb-3">
                Your event. One shared view.
              </span>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] uppercase font-display text-white">
                Every zone.
                <br />
                Every volunteer.
                <br />
                <span className="text-[#D4F728]">In sync.</span>
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-400">
                — Venue Map Preview
              </span>

              {/* Coverage Lens Switcher */}
              <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                <button
                  onClick={() => setCoverageLens('attendance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    coverageLens === 'attendance'
                      ? 'bg-[#D4F728] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verified Attendance
                </button>
                <button
                  onClick={() => setCoverageLens('schedule')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    coverageLens === 'schedule'
                      ? 'bg-[#D4F728] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Scheduled Rosters
                </button>
              </div>

              <Link
                to="/overview"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all flex items-center gap-1.5"
              >
                <span>Full Interactive Map</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4F728]" />
              </Link>
            </div>
          </div>

          {/* Interactive Map Canvas Container */}
          <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl">
            {/* The 3D Isometric Night Venue Map Image */}
            <div className="relative aspect-[16/9] sm:aspect-[21/9] min-h-[420px] w-full overflow-hidden">
              <img
                src="/venue/rally-night.jpg"
                alt="Rally Isometric Venue Map at Night"
                className="w-full h-full object-cover object-center filter contrast-110"
              />

              {/* Glowing Night Atmosphere Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070514]/80 via-transparent to-[#070514]/40 pointer-events-none" />

              {/* Interactive Location Pins overlaid across the festival stages and zones */}
              {zonePins.map((pin) => {
                const isActive = activeZonePin === pin.id;
                return (
                  <div
                    key={pin.id}
                    style={{ left: pin.x, top: pin.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                    onClick={() => setActiveZonePin(pin.id)}
                  >
                    {/* Pulsing Ripple Effect */}
                    <div
                      className={`absolute -inset-3 rounded-full transition-all ${
                        isActive
                          ? 'bg-[#D4F728]/40 animate-ping'
                          : 'bg-[#D4F728]/20 group-hover:animate-ping'
                      }`}
                    />

                    {/* The Yellow-Lime Marker Pin matching user screenshot */}
                    <div
                      className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 ${
                        isActive
                          ? 'bg-[#D4F728] text-slate-950 scale-125 ring-4 ring-[#D4F728]/50 shadow-[0_0_25px_rgba(212,247,40,0.8)]'
                          : 'bg-[#D4F728] text-slate-950 hover:scale-115'
                      }`}
                    >
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    </div>

                    {/* Tooltip on Hover or Active */}
                    <div
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none transition-all duration-300 z-30 ${
                        isActive
                          ? 'opacity-100 translate-y-0 scale-100'
                          : 'opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0'
                      }`}
                    >
                      <div className="whitespace-nowrap px-3.5 py-2 rounded-xl bg-slate-950/90 border border-white/20 backdrop-blur-md shadow-2xl text-left">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#D4F728] animate-pulse" />
                          <span className="text-xs font-black text-white">{pin.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 mt-1 text-[10px] text-slate-300">
                          <span className="font-mono text-[#D4F728] font-bold">
                            {pin.headcount}
                          </span>
                          <span className="text-slate-400">Lead: {pin.lead}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Floating Zone Detail Drawer (Glass Card at Bottom-Left of Map) */}
              <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:max-w-md z-20">
                <div className="p-5 rounded-2xl bg-[#0B081E]/85 border border-white/20 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-[#D4F728]/20 text-[#D4F728] border border-[#D4F728]/30">
                      {activeZoneData.type}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {activeZoneData.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white tracking-tight">
                    {activeZoneData.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {activeZoneData.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
                    <div className="p-2 rounded-xl bg-white/5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Headcount
                      </span>
                      <span className="text-xs font-black text-[#D4F728]">
                        {activeZoneData.headcount}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Zone Lead
                      </span>
                      <span className="text-xs font-bold text-white truncate block">
                        {activeZoneData.lead}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Next Shift
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        {activeZoneData.nextHandover}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Legend Overlay at Top-Right */}
              <div className="hidden sm:flex absolute top-6 right-6 z-20 items-center gap-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4F728]" />
                  <span>Click pin to inspect zone</span>
                </span>
                <span className="text-white/20">|</span>
                <span className="text-emerald-400 font-mono font-bold">● Live Radar Active</span>
              </div>
            </div>

            {/* Quick Zone Navigation Strip */}
            <div className="p-4 bg-[#09071A] border-t border-white/10 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs uppercase font-mono font-bold text-slate-500 whitespace-nowrap pl-2">
                Active Hubs:
              </span>
              {zonePins.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveZonePin(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeZonePin === p.id
                      ? 'bg-[#D4F728] text-slate-950 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{p.name.split('(')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: SECOND VIDEO SPOTLIGHT (Festival Crowd & Live Event Energy) */}
      <section
        id="live-pulse"
        className="relative py-20 sm:py-28 px-6 bg-gradient-to-b from-[#070514] via-[#0D0924] to-[#070514] border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-xs font-bold uppercase tracking-widest text-[#D4F728] mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Feel The Energy · Coordinate The Crowd</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase font-display tracking-tight text-white">
              Built for the <span className="text-[#D4F728]">Electric Moments</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed">
              When 30,000 fans rush the gates or the headliner takes the stage, Rally gives field
              leads the live visibility to keep everyone safe, staffed, and smiling.
            </p>
          </div>

          {/* Cinematic Video Player Card with Telemetry HUD */}
          <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-black/80 shadow-[0_0_50px_rgba(112,84,232,0.25)]">
            <div className="relative aspect-[16/9] w-full max-h-[580px] overflow-hidden bg-black z-0">
              <video
                ref={showcaseVideoRef}
                autoPlay
                loop
                muted={showcaseIsMuted}
                playsInline
                preload="auto"
                className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              >
                <source src={showcaseVideoSrc} type="video/mp4" />
                <source src="/11832-233049403_medium.mp4" type="video/mp4" />
                <source src="/videos/11832-233049403_medium.mp4" type="video/mp4" />
              </video>

              {/* Video Overlay Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

              {/* Telemetry Top Bar on Video */}
              <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 flex-wrap gap-3">
                <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                    ● Live Field Ops Feed: Festival Concourse
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-xs font-mono font-bold text-[#D4F728]">
                    348 Volunteers Checked-In
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-xs font-mono font-bold text-emerald-400">
                    42 Shifts Active
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-xs font-mono font-bold text-slate-300">
                    0 Unresolved Gaps
                  </div>
                </div>
              </div>

              {/* Dynamic Floating Telemetry Chips across the video */}
              <div className="hidden lg:block absolute bottom-24 left-8 z-20 space-y-2">
                <div className="p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-emerald-500/40 text-left max-w-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-1">
                    <span>STAGE BARRIER SQUAD</span>
                    <span>100% COVERAGE</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    14 volunteers in position. Crowd pressure normal. Next handover in 22 min.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-amber-500/40 text-left max-w-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1">
                    <span>GATE 2 SURGE RELIEF</span>
                    <span>DISPATCH SENT</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    2 roaming standby volunteers redeployed via explainable matching.
                  </p>
                </div>
              </div>

              {/* Bottom Video Controls Bar */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleShowcasePlay}
                    className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
                  >
                    {showcaseIsPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5 text-[#D4F728]" />
                    )}
                  </button>

                  <button
                    onClick={toggleShowcaseMute}
                    className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
                  >
                    {showcaseIsMuted ? (
                      <VolumeX className="w-5 h-5 text-slate-300" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-[#D4F728]" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const next =
                        showcaseVideoSrc.includes('11832')
                          ? '/Landing.mp4'
                          : '/11832-233049403_medium.mp4';
                      setShowcaseVideoSrc(next);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#D4F728]" />
                    <span>Switch Feed Video</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/overview"
                    className="px-4 py-2.5 rounded-xl bg-[#D4F728] hover:bg-[#c6ea21] text-slate-950 text-xs sm:text-sm font-black transition-all hover:scale-105 flex items-center gap-1.5"
                  >
                    <span>Launch Live Command Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE 4-STEP OPERATIONAL FLOW ("How it works") */}
      <section
        id="how-it-works"
        className="relative py-20 sm:py-28 px-6 border-t border-white/10 bg-[#070514]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4F728] block mb-3">
                The Central Product Workflow
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase font-display tracking-tight text-white">
                From Cancellation to <span className="text-[#D4F728]">Instant Replacement</span>
              </h2>
            </div>
            <Link
              to="/shifts"
              className="text-sm font-bold text-[#D4F728] hover:underline flex items-center gap-1.5"
            >
              <span>Test the engine in Shift Planner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 4 Step Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative p-6 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-black text-slate-400 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                    STEP 01
                  </span>
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Volunteer Cancels</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Volunteer taps "Cannot Attend" on their mobile view. The cancellation reason is
                  instantly logged without phone calls or confusion.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-mono text-rose-300">
                <span>● Alert generated in 0.2s</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-3xl bg-[#0D0A24] border border-amber-500/30 hover:border-amber-500/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-black text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    STEP 02
                  </span>
                  <MapPin className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Staffing Gap Appears
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  The affected zone pin immediately switches to amber on the venue map.
                  Coordinators get a real-time notification with required skills.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-mono text-amber-300">
                <span>● Map pin turns amber</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-3xl bg-[#0D0A24] border border-violet-500/30 hover:border-violet-500/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-black text-violet-400 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30">
                    STEP 03
                  </span>
                  <Sparkles className="w-5 h-5 text-[#D4F728]" />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Deterministic Suggestions
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  No black-box guesswork. The matching engine evaluates standby crew by fewest hours,
                  availability windows, skills, and shift adjacency.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-mono text-violet-300">
                <span>● Explainable candidate ranking</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative p-6 rounded-3xl bg-[#0D0A24] border border-[#D4F728]/40 hover:border-[#D4F728] transition-all flex flex-col justify-between group shadow-[0_0_30px_rgba(212,247,40,0.15)]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-black text-slate-950 px-2.5 py-1 rounded-lg bg-[#D4F728]">
                    STEP 04
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-[#D4F728]" />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Atomic Reassignment
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Coordinator reviews before/after coverage for both zones and confirms the swap.
                  Both volunteers are instantly notified with updated credentials.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-mono text-[#D4F728]">
                <span>● Complete in under 45 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: ROLE-SPECIFIC EXPERIENCE */}
      <section
        id="volunteers"
        className="relative py-20 sm:py-28 px-6 bg-gradient-to-b from-[#070514] via-[#0B081E] to-[#070514] border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4F728] block mb-3">
              Engineered For Everyone On-Site
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase font-display tracking-tight text-white">
              One Tool. <span className="text-[#D4F728]">Every Perspective.</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-3">
              Whether you are directing 500 volunteers across a 50-acre festival or working your
              first gate shift, Rally keeps you empowered.
            </p>

            {/* Role Tabs */}
            <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setActiveRoleTab('organizers')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeRoleTab === 'organizers'
                    ? 'bg-[#D4F728] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                For Event Organizers
              </button>
              <button
                onClick={() => setActiveRoleTab('volunteers')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeRoleTab === 'volunteers'
                    ? 'bg-[#D4F728] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                For Volunteers
              </button>
              <button
                onClick={() => setActiveRoleTab('safety')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeRoleTab === 'safety'
                    ? 'bg-[#D4F728] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                For Safety &amp; Medical Leads
              </button>
            </div>
          </div>

          {/* Role Feature Showcase Content */}
          {activeRoleTab === 'organizers' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#D4F728]/10 text-[#D4F728] flex items-center justify-center mb-6">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Spatial Coverage Radar</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Know at a glance if any perimeter, bar, or stage is vulnerable. Switch between
                  real-time verified attendance and future shift requirements.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-6">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Atomic Shift Replacement</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  No more messy group chats or radio chaos. Get instant ranked backup candidates
                  weighted by fatigue, skills, and availability.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-6">
                  <Radio className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Targeted Broadcast Alerts</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Send high-priority alerts to specific zones, roles, or the entire on-site roster in
                  seconds with read receipt confirmation.
                </p>
              </div>
            </div>
          )}

          {activeRoleTab === 'volunteers' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">One-Tap Mobile Check-In</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Zero app install needed. Open the mobile web link to view your shift countdown,
                  zone map location, and check in when you arrive on site.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#D4F728]/10 text-[#D4F728] flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Clear Handover Notes</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Read instructions left by the outgoing volunteer before your shift begins. Radio
                  frequencies, locker codes, and VIP notes in one place.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Incident &amp; Hazard Reporting</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Spot a broken barrier, spill, or attendee in distress? File a quick ticket with
                  photo and location directly to safety leads.
                </p>
              </div>
            </div>
          )}

          {activeRoleTab === 'safety' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Priority Medical Triage</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Real-time status tracking for medical tents, first aid rovers, and emergency vehicle
                  access lanes with zero delay.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Crowd Surge Redistribution</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  When turnstiles or stage barriers experience unexpected bottlenecks, dispatch standby
                  personnel with instant before/after headcount previews.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#0D0A24] border border-white/10 hover:border-[#D4F728]/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Auditable Post-Event Logs</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Download time-stamped incident logs, attendance records, and shift completion data
                  for city compliance, insurance, and festival debriefs.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6: QUANTIFIED PROOF POINTS & STATS */}
      <section className="py-16 sm:py-20 px-6 border-t border-white/10 bg-[#070514]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <span className="text-3xl sm:text-5xl font-black text-[#D4F728] font-display block">
                &lt; 45s
              </span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mt-2 block">
                Average Replacement Speed
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <span className="text-3xl sm:text-5xl font-black text-white font-display block">
                99.4%
              </span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mt-2 block">
                Shift Check-In Rate
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <span className="text-3xl sm:text-5xl font-black text-[#D4F728] font-display block">
                0
              </span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mt-2 block">
                Radio Channel Collisions
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <span className="text-3xl sm:text-5xl font-black text-white font-display block">
                24k+
              </span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mt-2 block">
                Festival Hours Coordinated
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FINAL CALL TO ACTION */}
      <section className="py-20 sm:py-28 px-6 border-t border-white/10 bg-gradient-to-b from-[#070514] via-[#100B29] to-[#070514] relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-[#D4F728] block mb-4">
            Ready to elevate your event?
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase font-display tracking-tight text-white max-w-4xl mx-auto leading-none">
            Big Events. <span className="text-[#D4F728]">Better Together.</span>
          </h2>
          <p className="text-base sm:text-xl text-slate-300 max-w-xl mx-auto mt-6 leading-relaxed">
            Create an event in 60 seconds or test with our live festival sandbox. No credit card
            required.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleCreateEventClick}
              className="px-8 py-3.5 rounded-xl bg-[#D4F728] hover:bg-[#c6ea21] text-slate-950 font-black text-sm sm:text-base tracking-tight box-glow-lime transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>Organize an event</span>
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <Link
              to="/overview"
              className="px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm sm:text-base border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>Explore Ignite Fest Demo</span>
              <ArrowRight className="w-4 h-4 text-[#D4F728]" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10 px-6 bg-[#05030E] text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-black italic text-xl text-[#D4F728]">RALLY</span>
            <span className="text-slate-400">·</span>
            <span>Real-time event &amp; volunteer crowd coordination platform</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('venue-map')}
              className="hover:text-white transition-colors"
            >
              Venue Map
            </button>
            <Link to="/shifts" className="hover:text-white transition-colors">
              Shift Planner
            </Link>
            <Link to="/volunteers" className="hover:text-white transition-colors">
              Directory
            </Link>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Engine Online
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-white/5 text-center md:text-left text-slate-600">
          © {new Date().getFullYear()} RALLY Systems Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
