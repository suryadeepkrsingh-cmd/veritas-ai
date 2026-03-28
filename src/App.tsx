import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Shield,
  Link as LinkIcon,
  Copy,
  Share2,
  MessageSquarePlus,
  AlertCircle,
  BarChart3,
  Activity,
  Flag,
  History,
  ChevronRight,
  FileSearch,
  Sparkles,
  ClipboardCheck,
  ServerCrash,
  Sun,
  Moon,
  X,
  Download,
} from 'lucide-react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { fetchUrlPreview, submitFeedback, verifyClaim } from './lib/ai';
import type { VerificationResult } from './lib/ai';
import type { UrlPreviewResult } from './lib/ai';

import readmeContent from '../README.md?raw';

const examplePrompts = [
  'Did India win the 2026 T20 World Cup?',
  'The earth is flat',
  'Sponsored headline claims a celebrity moment is everything',
  'https://example.com/news/viral-claim',
];

const riskyTerms = [
  'shocking',
  'viral',
  'breaking',
  'must watch',
  'must see',
  'sponsored',
  'followers',
  'emotional',
  'everything',
  'guaranteed',
  'secret',
  'historic',
  'unprecedented',
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedContent({ text }: { text: string }) {
  const matches = riskyTerms.filter((term) => text.toLowerCase().includes(term));

  if (matches.length === 0) {
    return <p className="text-base leading-7 text-slate-200">{text}</p>;
  }

  const regex = new RegExp(`(${matches.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <p className="text-base leading-7 text-slate-200">
      {parts.map((part, index) => {
        const isMatch = matches.some((term) => term.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-100"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </p>
  );
}

function HorizontalMetric({ title, value, desc, icon: Icon, color, valColor }: { title: string; value: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string; valColor: string }) {
  return (
    <div
      className="spark-border flex flex-1 items-center gap-4 rounded-2xl p-4 shadow-lg min-w-[200px]"
      style={{ '--color-card': color } as CSSProperties}
    >
      <div className="spark-icon flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-inner">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
        <div className={`truncate text-xl font-black ${valColor}`}>{value}</div>
        <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-widest text-slate-400 opacity-60">
          {desc}
        </p>
      </div>
    </div>
  );
}

function HeroVerdictCard({ result }: { result: VerificationResult }) {
  const isFalse = result.verdict === 'False';
  const color = 'var(--verdict-color)';
  const valColor = isFalse ? 'text-red-500' : 'text-emerald-500';

  return (
    <div
      className="relative flex h-[350px] w-full flex-col items-center justify-center rounded-3xl border-2 p-8 shadow-2xl transition-all duration-500"
      style={{
        borderColor: `rgba(${color}, 0.3)`,
        background: `radial-gradient(circle at center, rgba(${color}, 0.1) 0%, transparent 70%), rgba(15, 23, 42, 0.4)`,
        boxShadow: `0 0 40px rgba(${color}, 0.15), inset 0 0 20px rgba(${color}, 0.05)`
      } as CSSProperties}
    >
      <div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-inner">
        <AlertCircle className={`h-12 w-12 ${valColor}`} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.4em] text-white/40">Final Verdict</h3>
        <div className={`text-6xl font-black tracking-tighter ${valColor} drop-shadow-[0_0_15px_rgba(${color},0.5)]`}>
          {result.verdict}
        </div>
      </div>

      <p className="relative z-10 mt-6 text-[11px] font-black text-center uppercase tracking-[0.3em] text-white/30">
        AI Sentinel Verification Secure
      </p>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';

    const savedTheme = window.localStorage.getItem('veritas-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | VerificationResult>(null);
  const [history, setHistory] = useState<{ claim: string; result: VerificationResult }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeClaim, setActiveClaim] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [urlPreview, setUrlPreview] = useState<UrlPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const feedbackModalTimerRef = useRef<number | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);
  const howItWorksRef = useRef<HTMLElement | null>(null);

  const inputProfile = useMemo(() => {
    const trimmed = activeClaim.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    const isUrl = /^https?:\/\//i.test(trimmed);
    const hasQuestionMark = trimmed.includes('?');

    return {
      type: isUrl ? 'Article URL' : hasQuestionMark ? 'Question' : 'Claim',
      wordCount,
      readingTime: Math.max(1, Math.ceil(wordCount / 180)),
    };
  }, [activeClaim]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('veritas-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (result && !loading && dashboardRef.current) {
      dashboardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result, loading]);

  useEffect(() => {
    return () => {
      if (feedbackModalTimerRef.current) {
        window.clearTimeout(feedbackModalTimerRef.current);
        feedbackModalTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const trimmed = input.trim();
    const isUrl = /^https?:\/\//i.test(trimmed);

    if (!isUrl) {
      setUrlPreview(null);
      setPreviewLoading(false);
      setPreviewError('');
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setPreviewLoading(true);
        setPreviewError('');
        const preview = await fetchUrlPreview(trimmed);
        setUrlPreview(preview);
      } catch (error) {
        console.error('Preview error', error);
        setUrlPreview(null);
        setPreviewError('Could not fetch URL preview right now.');
      } finally {
        setPreviewLoading(false);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [input]);

  const handleVerify = async (overrideInput?: string) => {
    const claimToVerify = overrideInput || input;
    if (!claimToVerify) return;

    setLoading(true);
    setActiveClaim(claimToVerify);

    try {
      const data = await verifyClaim(claimToVerify);
      setResult(data);
      setIsFeedbackModalOpen(false);
      setFeedbackStatus('idle');
      setFeedbackForm({ name: '', email: '', message: '' });

      if (feedbackModalTimerRef.current) {
        window.clearTimeout(feedbackModalTimerRef.current);
        feedbackModalTimerRef.current = null;
      }

      if (!overrideInput) {
        setHistory((prev) => [{ claim: claimToVerify, result: data }, ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownloadReadme = () => {
    const blob = new Blob([readmeContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Veritas-AI-README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySummary = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(
        `Verdict: ${result.verdict}\nConfidence: ${(result.confidence * 100).toFixed(1)}%\nExplanation: ${result.explanation}`,
      );
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 1800);
    } catch (error) {
      console.error('Failed to copy summary', error);
    }
  };

  const handleShareResult = async () => {
    if (!result) return;

    const summary = `Veritas AI Verdict: ${result.verdict} (${(result.confidence * 100).toFixed(1)}%)\nClaim: ${activeClaim}\n${result.explanation}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Veritas AI Verification Result',
          text: summary,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 1800);
    } catch (error) {
      console.error('Failed to share summary', error);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!result || feedbackStatus === 'sending') return;

    const name = feedbackForm.name.trim();
    const email = feedbackForm.email.trim();
    const message = feedbackForm.message.trim();

    if (!name || !email || !message) {
      setFeedbackStatus('error');
      return;
    }

    try {
      setFeedbackStatus('sending');
      await submitFeedback({
        claim: activeClaim,
        verdict: result.verdict,
        confidence: result.confidence,
        helpful,
        name,
        email,
        message,
      });
      setFeedbackStatus('done');
    } catch (error) {
      console.error('Feedback submission failed', error);
      setFeedbackStatus('error');
    }
  };

  return (
    <div className="relative min-h-screen w-full text-slate-200">
      <ThreeCanvas theme={theme} />
      <div className="ambient-orbs pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="ambient-orb ambient-orb-one" />
        <div className="ambient-orb ambient-orb-two" />
        <div className="ambient-orb ambient-orb-three" />
      </div>

      <div className="app-shell relative z-10 flex min-h-screen w-full flex-col items-center p-6 md:p-12">
        <header className="floating-header mb-12 flex w-full max-w-5xl items-center justify-between">
          <div className="veritas-logo flex cursor-pointer items-center gap-3 group">
            <div className="veritas-icon-container flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 transition-all duration-300">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="logo-font text-2xl font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-blue-400">
              Veritas <span className="text-blue-500">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={handleDownloadReadme}
              className="nav-action-button inline-flex items-center gap-2"
              title="Download README"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </button>
            <button
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="nav-action-button inline-flex items-center gap-2"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>

            <nav className="hidden items-center gap-6 md:flex">
              <button onClick={scrollToHowItWorks} className="animated-button">
                <svg viewBox="0 0 24 24" className="arr-2" aria-hidden="true">
                  <path d="M6 12h12m-5-5 5 5-5 5" />
                </svg>
                <span className="text">How It Works</span>
                <span className="circle" />
                <svg viewBox="0 0 24 24" className="arr-1" aria-hidden="true">
                  <path d="M6 12h12m-5-5 5 5-5 5" />
                </svg>
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="animated-button"
              >
                <svg viewBox="0 0 24 24" className="arr-2" aria-hidden="true">
                  <path d="M6 12h12m-5-5 5 5-5 5" />
                </svg>
                <span className="text">History</span>
                <span className="circle" />
                <svg viewBox="0 0 24 24" className="arr-1" aria-hidden="true">
                  <path d="M6 12h12m-5-5 5 5-5 5" />
                </svg>
              </button>
            </nav>
          </div>
        </header>

        <div
          className={`fixed right-0 top-0 z-50 h-full w-80 border-l border-white/10 transition-transform duration-500 ease-in-out ${showHistory ? 'translate-x-0' : 'translate-x-full shadow-none'
            } glass`}
        >
          <div className="flex h-full flex-col p-6">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <History className="h-5 w-5 text-blue-400" /> Recent Checks
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            <div className="styled-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto pr-2">
              {history.length === 0 ? (
                <p className="text-sm italic text-slate-500">No recent checks in this session.</p>
              ) : (
                history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setResult(item.result);
                      setActiveClaim(item.claim);
                      setInput(item.claim);
                      setShowHistory(false);
                    }}
                    className="group rounded-xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:bg-white/10"
                  >
                    <p className="mb-1 flex justify-between text-xs font-bold text-slate-400">
                      {item.result.verdict}
                      <span className="text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                        View →
                      </span>
                    </p>
                    <p className="line-clamp-2 text-sm text-slate-200">{item.claim}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <main className="hero-3d-section flex min-h-[calc(100vh-13rem)] w-full max-w-2xl flex-col items-center justify-center text-center">
          <h2 className="logo-font hover-heading mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
            Verify any <span className="text-gradient">Claim</span> or{' '}
            <span className="text-gradient">URL</span> instantly
          </h2>
          <p className="mb-10 max-w-lg text-lg text-slate-400">
            Deploy advanced Fact-Checking agents to analyze news, social media, and research
            papers with cryptographic precision.
          </p>

          <div className="query-panel-3d flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="searchfx-wrap">
              <div className="searchfx-grid" />
              <div className="searchfx-darkBorderBg" />
              <div className="searchfx-glow" />
              <div className="searchfx-white" />
              <div className="searchfx-border" />

              <div className="searchfx-main">
                <LinkIcon className="searchfx-icon h-5 w-5 text-slate-300" />
                <input
                  type="text"
                  placeholder="Paste claim or URL here..."
                  className="searchfx-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <div className="searchfx-input-mask" />
              </div>
            </div>
            <button
              onClick={() => handleVerify()}
              disabled={loading}
              className="verify-loader-button rounded-xl px-6 py-3 disabled:opacity-60"
            >
              <span className="verify-button-content" aria-live="polite">
                {loading ? (
                  <svg className="pencil" viewBox="0 0 200 200" aria-hidden="true">
                    <defs>
                      <clipPath id="pencil-eraser">
                        <rect x="0" y="0" width="30" height="30" rx="5" ry="5" />
                      </clipPath>
                    </defs>
                    <circle
                      className="pencil__stroke"
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="439.82 439.82"
                      strokeLinecap="round"
                    />
                    <g className="pencil__rotate" transform="translate(100,100)">
                      <g fill="none">
                        <circle
                          className="pencil__body1"
                          r="64"
                          stroke="hsl(30,90%,50%)"
                          strokeWidth="30"
                          strokeDasharray="402.12 402.12"
                          strokeDashoffset="351.86"
                          transform="rotate(-90)"
                        />
                        <circle
                          className="pencil__body2"
                          r="44"
                          stroke="hsl(30,90%,60%)"
                          strokeWidth="10"
                          strokeDasharray="276.46 276.46"
                          strokeDashoffset="406.84"
                          transform="rotate(-90)"
                        />
                        <circle
                          className="pencil__body3"
                          r="34"
                          stroke="hsl(30,90%,40%)"
                          strokeWidth="10"
                          strokeDasharray="213.63 213.63"
                          strokeDashoffset="296.88"
                          transform="rotate(-90)"
                        />
                      </g>
                      <g className="pencil__eraser" transform="rotate(-90) translate(49,0)">
                        <g className="pencil__eraser-skew">
                          <rect
                            x="-15"
                            y="-9"
                            width="30"
                            height="18"
                            rx="4"
                            ry="4"
                            fill="hsl(0,90%,70%)"
                          />
                          <rect x="-5" y="-9" width="10" height="18" fill="hsl(0,90%,60%)" />
                        </g>
                      </g>
                      <g className="pencil__point" transform="rotate(-90) translate(49,-30)">
                        <polygon points="15,0 0,10 0,-10" fill="hsl(33,90%,70%)" />
                        <polygon points="15,0 12,2 12,-2" fill="hsl(223,10%,10%)" />
                      </g>
                    </g>
                  </svg>
                ) : (
                  <span className="verify-button-label">VERIFY</span>
                )}
              </span>
            </button>
          </div>

          <div className="mt-5 w-full text-left">
            {previewLoading && (
              <div className="mb-3 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
                Fetching URL preview...
              </div>
            )}

            {previewError && (
              <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {previewError}
              </div>
            )}

            {urlPreview && !previewLoading && (
              <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                  URL preview · {urlPreview.domain}
                </p>
                <h4 className="line-clamp-1 text-sm font-semibold text-white">{urlPreview.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{urlPreview.excerpt}</p>
              </div>
            )}

            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Example Prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-all hover:bg-white/10 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </main>

        {result && !loading && (
          <section
            ref={dashboardRef}
            className="mt-12 flex min-h-screen w-full max-w-5xl scroll-mt-8 flex-col justify-end gap-5 pb-6 text-left"
          >
            {result.backendOffline && (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5 shadow-xl backdrop-blur-md">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-2 text-amber-300">
                      <ServerCrash className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-200">Verification backend is offline</p>
                      <p className="mt-1 text-sm text-amber-100/80">
                        Start the backend server with <span className="font-semibold text-white">npm run server</span>, then submit the claim again.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 font-mono text-sm text-sky-300">
                    npm run server
                  </div>
                </div>
              </div>
            )}

            <div className="dashboard-card glass rounded-3xl border border-white/10 p-6 shadow-xl md:p-8">
              <div className="mb-6 flex flex-col gap-4 border-b border-white/5 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
                    Detail Dashboard
                  </p>
                  <h3 className="text-2xl font-bold text-white md:text-3xl">
                    Full article or question breakdown
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5">
                    {inputProfile.type}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {inputProfile.wordCount} words
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {inputProfile.readingTime} min read
                  </span>
                </div>
              </div>

              <div className="mb-12 space-y-8">
                <div className="flex flex-col space-y-8 lg:flex-row lg:items-center lg:gap-12 lg:space-y-0 text-left">
                  <div className="flex-1 space-y-6">
                    <div className="rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-sm">
                      <div className="mb-6 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgb(59,130,246)]" />
                        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">
                          Primary Claim Submission
                        </p>
                      </div>
                      <div className="text-lg leading-relaxed text-slate-200 lg:text-xl">
                        <HighlightedContent text={activeClaim} />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-emerald-500/5 p-8 backdrop-blur-sm">
                      <div className="mb-6 flex items-center gap-3 text-emerald-500">
                        <div className="rounded-lg bg-emerald-500/10 p-2">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.3em]">
                          Sentinel Intelligence Summary
                        </p>
                      </div>
                      <p className="text-xl font-bold text-white leading-relaxed lg:text-2xl">
                        This content has been classified as <span className={result.verdict === 'False' ? 'text-red-500' : 'text-emerald-500'}>{result.verdict}</span>.
                        Detected across {result.sources.length} sources with a neural confidence of {(result.confidence * 100).toFixed(1)}%.
                      </p>
                    </div>
                  </div>

                  <div className="lg:w-[400px]">
                    <HeroVerdictCard result={result} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <HorizontalMetric
                    title="Confidence"
                    value={`${(result.confidence * 100).toFixed(1)}%`}
                    desc="Neural Signal Strength"
                    icon={Activity}
                    color="var(--confidence-color)"
                    valColor="text-blue-400"
                  />
                  <HorizontalMetric
                    title="Misinformation Risk"
                    value={result.riskLevel}
                    desc="Pattern Match: Red Flag"
                    icon={Shield}
                    color="var(--risk-color)"
                    valColor="text-red-400"
                  />
                  <HorizontalMetric
                    title="Linguistic Tone"
                    value={result.sentiment}
                    desc="Structural Sentiment"
                    icon={Flag}
                    color="var(--tone-color)"
                    valColor="text-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                <div
                  className="spark-border dashboard-card group glass flex flex-col items-center justify-center rounded-2xl p-6 text-center shadow-xl transition-all duration-500 hover:scale-[1.05]"
                  style={{
                    '--color-card': result.verdict === 'False' ? '239, 68, 68' : result.verdict === 'True' ? '16, 185, 129' : '234, 179, 8'
                  } as CSSProperties}
                >
                  <div
                    className={`mb-4 flex h-24 w-24 items-center justify-center rounded-2xl shadow-lg transition-all duration-500 group-hover:scale-110 ${result.verdict === 'False'
                      ? 'bg-red-500/20 text-red-500 shadow-red-500/20'
                      : result.verdict === 'True'
                        ? 'bg-green-500/20 text-green-500 shadow-green-500/20'
                        : 'bg-yellow-500/20 text-yellow-500 shadow-yellow-500/20'
                      }`}
                  >
                    <AlertCircle className="h-12 w-12" />
                  </div>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Final Verdict
                  </h3>
                  <p
                    className={`mb-5 text-4xl font-black tracking-tight ${result.verdict === 'False'
                      ? 'text-red-400'
                      : result.verdict === 'True'
                        ? 'text-green-400'
                        : 'text-yellow-400'
                      }`}
                  >
                    {result.verdict}
                  </p>

                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${result.verdict === 'False'
                        ? 'bg-red-500'
                        : result.verdict === 'True'
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                        }`}
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    AI Confidence: {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>

                <div
                  className="spark-border dashboard-card group flex flex-col rounded-2xl p-6 shadow-xl md:col-span-3 transition-all duration-500 hover:scale-[1.05]"
                  style={{ '--color-card': '96, 165, 250' } as CSSProperties}
                >
                  <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
                      <Shield className="h-4 w-4 text-blue-400" /> AI Reasoning Analysis
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copySummary}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-200 transition-all hover:bg-white/10"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedSummary ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handleShareResult}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-200 transition-all hover:bg-white/10"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                      <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-400">
                        Real-Time Sync
                      </span>
                    </div>
                  </div>
                  <div className="styled-scrollbar max-h-[200px] flex-1 overflow-y-auto rounded-xl border border-white/5 bg-slate-900/40 p-5 text-sm font-medium leading-relaxed text-slate-300">
                    {result.explanation}
                  </div>

                  <div className="mt-4 rounded-xl border border-white/5 bg-white/5 p-4">
                    <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-400">
                      Help us improve our Sentinel Intelligence
                    </p>
                    <button
                      onClick={() => setIsFeedbackModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/30"
                    >
                      <MessageSquarePlus className="h-4 w-4" /> Open Feedback Form
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div
                  className="spark-border dashboard-card glass rounded-2xl p-6 shadow-xl"
                  style={{ '--color-card': '192, 132, 252' } as CSSProperties}
                >
                  <h3 className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <BarChart3 className="h-4 w-4 text-purple-400" /> Score Breakdown
                  </h3>
                  <div className="flex flex-col gap-6">
                    {[
                      {
                        label: 'Source Reliability',
                        val: result.scoreBreakdown?.sourceReliability || 0,
                        color: 'bg-blue-500',
                      },
                      {
                        label: 'Logical Consistency',
                        val: result.scoreBreakdown?.logicalConsistency || 0,
                        color: 'bg-emerald-500',
                      },
                      {
                        label: 'Factual Alignment',
                        val: result.scoreBreakdown?.factualAlignment || 0,
                        color: 'bg-purple-500',
                      },
                    ].map((metric, i) => (
                      <div key={i}>
                        <div className="mb-2 flex justify-between text-[11px] font-bold">
                          <span className="text-slate-300">{metric.label}</span>
                          <span className="text-slate-400">{(metric.val * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${metric.color}`}
                            style={{ width: `${metric.val * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="spark-border dashboard-card glass rounded-2xl p-6 shadow-xl"
                  style={{ '--color-card': '251, 146, 60' } as CSSProperties}
                >
                  <h3 className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <Activity className="h-4 w-4 text-orange-400" /> Signals & Sentiment
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                      <span className="text-xs font-bold text-slate-300">Sentiment Tone</span>
                      <span
                        className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${result.sentiment === 'Inflammatory'
                          ? 'bg-red-500/20 text-red-400'
                          : result.sentiment === 'Biased'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-blue-500/20 text-blue-400'
                          }`}
                      >
                        {result.sentiment}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                      <span className="text-xs font-bold text-slate-300">Misinformation Risk</span>
                      <span
                        className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${result.riskLevel === 'High'
                          ? 'bg-red-500/20 text-red-500'
                          : result.riskLevel === 'Medium'
                            ? 'bg-orange-500/20 text-orange-500'
                            : 'bg-green-500/20 text-green-500'
                          }`}
                      >
                        {result.riskLevel} Risk
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="spark-border dashboard-card glass rounded-2xl p-6 shadow-xl"
                  style={{ '--color-card': '239, 68, 68' } as CSSProperties}
                >
                  <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <Flag className="h-4 w-4 text-red-400" /> Detected Red Flags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.redFlags && result.redFlags.length > 0 ? (
                      result.redFlags.map((flag, i) => (
                        <span
                          key={i}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-400"
                        >
                          {flag}
                        </span>
                      ))
                    ) : (
                      <p className="px-1 pt-2 text-xs italic text-slate-500">
                        No significant red flags detected.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {result.sources && result.sources.length > 0 && (
                <div className="dashboard-card glass rounded-2xl border border-white/10 p-6 shadow-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
                    <LinkIcon className="h-4 w-4 text-emerald-400" /> Referenced Citations
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {result.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spark-border group glass relative flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-3 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:bg-slate-800/80"
                        style={{ '--color-card': '52, 211, 153' } as CSSProperties}
                      >
                        <div className="mt-0.5 rounded-md bg-emerald-500/10 p-1.5 text-emerald-400 transition-colors duration-300 group-hover:bg-emerald-500 group-hover:text-white">
                          <LinkIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-200">{src.name}</p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500 transition-colors group-hover:text-emerald-400/70">
                            {src.url}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {result.relatedClaims && result.relatedClaims.length > 0 && (
                <div
                  className="spark-border dashboard-card glass rounded-2xl border border-white/10 bg-blue-500/5 p-6 shadow-xl"
                  style={{ '--color-card': '52, 211, 153' } as CSSProperties}
                >
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
                    <Activity className="h-4 w-4 text-blue-400" /> Related Intelligence & Similar
                    Claims
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {result.relatedClaims.map((item, i) => (
                      <div
                        key={i}
                        className="dashboard-card group glass relative overflow-hidden rounded-xl border border-white/5 p-4 transition-all"
                        style={{ '--color-card': '52, 211, 153' } as CSSProperties}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <span
                            className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.verdict === 'True'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                              }`}
                          >
                            {item.verdict}
                          </span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 transition-colors hover:text-blue-400"
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-tight text-slate-300">
                          {item.claim}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {isFeedbackModalOpen && result && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl">
              <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-blue-400/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />

              <div className="mb-4 flex items-center justify-between">
                <h3 className="relative z-10 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-100">
                  <MessageSquarePlus className="h-4 w-4 text-blue-300" /> Feedback Form
                </h3>
                <button
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="relative z-10 rounded-md p-1 text-slate-300 hover:bg-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {feedbackStatus === 'done' ? (
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <p className="font-bold">Thank you for your feedback! 🙌</p>
                  <p className="mt-1 text-emerald-100/90">
                    Your feedback is saved and will help us improve prompts and accuracy.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-xs text-slate-200/90">
                    Prompt suggestion: Tell us what was useful, what was missing, and how we can improve the verdict response.
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={feedbackForm.name}
                      onChange={(e) => setFeedbackForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-sm text-white placeholder:text-slate-300/60 outline-none focus:border-blue-300/70 focus:ring-2 focus:ring-blue-300/30"
                    />
                    <input
                      type="email"
                      value={feedbackForm.email}
                      onChange={(e) => setFeedbackForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Your email"
                      className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-sm text-white placeholder:text-slate-300/60 outline-none focus:border-blue-300/70 focus:ring-2 focus:ring-blue-300/30"
                    />
                  </div>
                  <textarea
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Any message or feedback you want to give"
                    rows={4}
                    className="mt-3 w-full rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-sm text-white placeholder:text-slate-300/60 outline-none focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/30"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleFeedback(true)}
                      disabled={feedbackStatus === 'sending'}
                      className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
                    >
                      Submit as Helpful
                    </button>
                    <button
                      onClick={() => handleFeedback(false)}
                      disabled={feedbackStatus === 'sending'}
                      className="rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-60"
                    >
                      Submit as Needs Improvement
                    </button>
                    {feedbackStatus === 'error' && (
                      <span className="inline-flex items-center rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-200">
                        Please fill name, email, and message.
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <section
          ref={howItWorksRef}
          className="mt-10 w-full max-w-5xl scroll-mt-8 rounded-3xl border border-white/10 bg-slate-950/35 p-6 text-left shadow-xl backdrop-blur-md md:p-8"
        >
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
                How It Works
              </p>
              <h3 className="text-2xl font-bold text-white">Three steps to verify any article or question</h3>
            </div>
            <p className="max-w-xl text-sm text-slate-400">
              Paste a claim, question, or article URL and the app generates a verdict, reasoning,
              confidence score, risk signal, and related references.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div
              className="spark-border dashboard-card glass rounded-2xl p-5 shadow-xl"
              style={{ '--color-card': '96, 165, 250' } as CSSProperties}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Step 1</p>
                <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 p-2 text-blue-300">
                  <FileSearch className="h-4 w-4" />
                </div>
              </div>
              <h4 className="mb-2 text-lg font-bold text-white">Submit content</h4>
              <p className="text-sm leading-6 text-slate-300">
                Enter a news claim, paste a question, or add an article URL in the search box.
              </p>
            </div>

            <div
              className="spark-border dashboard-card glass rounded-2xl p-5 shadow-xl"
              style={{ '--color-card': '96, 165, 250' } as CSSProperties}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-pink-400">Step 2</p>
                <div className="rounded-xl border border-pink-400/20 bg-pink-400/10 p-2 text-pink-300">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <h4 className="mb-2 text-lg font-bold text-white">AI analyzes signals</h4>
              <p className="text-sm leading-6 text-slate-300">
                The verifier checks reasoning quality, factual alignment, tone, source trust, and
                possible red flags.
              </p>
            </div>

            <div
              className="spark-border dashboard-card glass rounded-2xl p-5 shadow-xl"
              style={{ '--color-card': '96, 165, 250' } as CSSProperties}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Step 3</p>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
              </div>
              <h4 className="mb-2 text-lg font-bold text-white">Review the dashboard</h4>
              <p className="text-sm leading-6 text-slate-300">
                Use the detail dashboard to inspect the verdict, confidence, explanation, related
                claims, and citations.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex w-full max-w-5xl items-center justify-center border-t border-white/5 pt-12 pb-6 text-[12px] text-slate-600">
          <p>&copy; 2026 Veritas AI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
