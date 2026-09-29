import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Pause,
  Mic,
  Radio,
  Sparkles,
  Loader2,
  Flame,
  Zap,
  ShieldCheck,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Timer,
} from 'lucide-react';
import {
  commentatorAudio,
  MAIN_CASTER,
  RateLimitState,
} from '../utils/commentatorAudio';

interface MatchCommentatorPlayerProps {
  analysisText: string;
  matchId?: number | string;
  variant?: 'compact' | 'full';
  matchTitle?: string;
  className?: string;
}

export const MatchCommentatorPlayer: React.FC<MatchCommentatorPlayerProps> = ({
  analysisText,
  matchId,
  variant = 'full',
  matchTitle,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [commentaryMode, setCommentaryMode] = useState<'full' | 'recap'>('full');
  const [isAiAudioSource, setIsAiAudioSource] = useState(true);
  const [activeProviderName, setActiveProviderName] = useState<string>('Gemini AI Caster');
  const [isStoredInDb, setIsStoredInDb] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Subscribe to rate limit state
  useEffect(() => {
    const unsubscribe = commentatorAudio.subscribeRateLimit((limit) => {
      setRateLimitInfo(limit);
    });
    return unsubscribe;
  }, []);

  // Countdown timer for rate limit
  useEffect(() => {
    if (!rateLimitInfo || rateLimitInfo.resetTimestamp <= Date.now()) {
      setSecondsLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitInfo.resetTimestamp - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setRateLimitInfo(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rateLimitInfo]);

  // Check if audio already exists in Firestore database
  useEffect(() => {
    let isMounted = true;
    if (analysisText) {
      commentatorAudio.checkStoredAudio(matchId, analysisText, commentaryMode).then((hasAudio) => {
        if (isMounted) setIsStoredInDb(hasAudio);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [analysisText, matchId, commentaryMode]);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        commentatorAudio.stop();
      }
    };
  }, [isPlaying]);

  const handlePlay = (overrideMode?: 'full' | 'recap', forceRegenerate = false) => {
    if (!analysisText || isLoading) return;

    if (isPaused && !forceRegenerate) {
      commentatorAudio.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const activeMode = overrideMode || commentaryMode;
    setIsLoading(true);

    commentatorAudio.playCasterCommentary(analysisText, {
      matchId,
      mode: activeMode,
      forceRegenerate,
      onLoading: () => {
        setIsLoading(true);
      },
      onStart: (isAiAudio, providerName) => {
        setIsLoading(false);
        setIsPlaying(true);
        setIsPaused(false);
        setIsAiAudioSource(isAiAudio);
        setIsStoredInDb(true);
        setRateLimitInfo(null);
        if (providerName) {
          setActiveProviderName(providerName);
        }
      },
      onEnd: () => {
        setIsLoading(false);
        setIsPlaying(false);
        setIsPaused(false);
      },
      onRateLimit: (limit) => {
        setIsLoading(false);
        setIsPlaying(false);
        setIsPaused(false);
        setRateLimitInfo(limit);
      },
      onError: (err) => {
        console.warn('Playback error:', err);
        setIsLoading(false);
        setIsPlaying(false);
        setIsPaused(false);
      },
    });
  };

  const handlePause = () => {
    commentatorAudio.pause();
    setIsPaused(true);
  };

  const handleStop = () => {
    commentatorAudio.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
  };

  if (!analysisText) return null;

  const isUnderLimit = !isStoredInDb && secondsLeft > 0;

  // Compact variant for chat cards
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {isLoading ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/60 bg-[#251F1B] px-2 py-1 text-[11px] font-bold text-[#E8B33D]">
            <Loader2 size={12} className="animate-spin text-[#E8B33D]" />
            <span>Meracik Suara Caster...</span>
          </div>
        ) : isPlaying ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/60 bg-[#251F1B] px-2 py-1 text-[11px] font-bold text-[#E8B33D] shadow-sm">
            <span className="flex items-center gap-0.5">
              <span className="h-2 w-0.5 animate-[bounce_0.6s_ease-in-out_infinite] bg-[#E8B33D] rounded-full" />
              <span className="h-3.5 w-0.5 animate-[bounce_0.6s_ease-in-out_0.2s_infinite] bg-[#E8B33D] rounded-full" />
              <span className="h-2.5 w-0.5 animate-[bounce_0.6s_ease-in-out_0.4s_infinite] bg-[#E8B33D] rounded-full" />
            </span>
            <span className="text-[10px]">Caster MLBB Bicara</span>
            <button
              type="button"
              onClick={handleStop}
              className="ml-1 rounded p-0.5 text-[#9C948A] hover:bg-[#161311] hover:text-rose-400 cursor-pointer"
              title="Stop"
            >
              <Square size={10} fill="currentColor" />
            </button>
          </div>
        ) : isUnderLimit ? (
          <div
            className="flex items-center gap-1 rounded-lg border border-amber-600/50 bg-[#26180E] px-2 py-1 text-[11px] font-bold text-amber-400 shadow-xs cursor-not-allowed"
            title={`Kapasitas AI Caster sedang limit. Estimasi siap kembali pada ${rateLimitInfo?.resetTimeFormatted || 'segera'} (${secondsLeft}s lagi)`}
          >
            <AlertTriangle size={11} className="text-amber-400" />
            <span>Limit ({secondsLeft}s)</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handlePlay()}
            className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/50 bg-gradient-to-r from-[#2A2118] to-[#1E1712] hover:border-[#E8B33D] px-2.5 py-1 text-[11px] font-bold text-[#E8B33D] transition-all cursor-pointer shadow-xs active:scale-95 hover:brightness-110"
            title={
              isStoredInDb
                ? 'Audio ulasan sudah tersimpan di database. Klik untuk putar seketika!'
                : 'Dengarkan ulasan highlight ini dengan suara caster esports paling gokil'
            }
          >
            <Radio size={12} className="text-[#E8B33D]" />
            <span>🎙️ Suara Caster AI</span>
            {isStoredInDb && (
              <span className="rounded-full bg-cyan-400/20 px-1 py-0.2 text-[9px] font-black text-cyan-300">
                DB
              </span>
            )}
          </button>
        )}
      </div>
    );
  }

  // Full audio player bar variant for modal & details
  return (
    <div
      className={`rounded-2xl border-2 border-[#E8B33D]/40 bg-gradient-to-r from-[#201915] via-[#2A2019] to-[#1E1713] p-4 shadow-xl relative overflow-hidden space-y-3 ${className}`}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#E8B33D]/10 blur-2xl" />

      {/* Rate Limit Active Alert Banner */}
      {isUnderLimit && rateLimitInfo && (
        <div className="rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/70 via-[#2A180B] to-[#1C120A] p-3.5 space-y-2 text-xs shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 animate-bounce" />
              <span className="uppercase tracking-wider">Batas Kuota AI Sedang Limit</span>
            </div>
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-black text-amber-300 flex items-center gap-1">
              <Clock size={11} />
              <span>Cooldown: {secondsLeft} Detik</span>
            </span>
          </div>
          <p className="text-[#D5CEBF] leading-relaxed text-[11px]">
            {rateLimitInfo.message || 'Kapasitas generate suara AI Caster sedang mencapai limit. Proses otomatis dihentikan agar terhindar dari suara robot kaku.'}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[10px] text-[#9C948A] flex-wrap gap-1">
            <span>
              Estimasi siap kembali: <strong className="text-amber-300 font-bold">{rateLimitInfo.resetTimeFormatted}</strong> ({secondsLeft}s lagi)
            </span>
            <span className="text-amber-400/90 font-medium">Anti suara robot · Kualitas audio tetap natural</span>
          </div>
        </div>
      )}

      {/* Top row: Status, Tag, and Main Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#332C25]/80 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
              isPlaying
                ? 'border-[#E8B33D] bg-[#E8B33D]/20 text-[#E8B33D] shadow-lg shadow-[#E8B33D]/25'
                : isUnderLimit
                ? 'border-amber-600/50 bg-amber-950/40 text-amber-400'
                : 'border-[#332C25] bg-[#161311] text-[#9C948A]'
            }`}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin text-[#E8B33D]" />
            ) : isPlaying ? (
              <Radio size={20} className="animate-pulse text-[#E8B33D]" />
            ) : isUnderLimit ? (
              <Timer size={20} className="text-amber-400" />
            ) : (
              <Mic size={20} className="text-[#E8B33D]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black uppercase tracking-wide text-[#F2EDE4] flex items-center gap-1.5">
                <span>🎙️ Caster Utama MLBB</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8B33D]/15 border border-[#E8B33D]/40 px-2 py-0.5 text-[10px] font-black text-[#E8B33D]">
                <Flame size={10} className="text-amber-400 fill-amber-400" />
                <span>Gaya Paling Gokil</span>
              </span>
              {isStoredInDb && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold text-cyan-400" title="Audio tersimpan di database Firestore dan siap diputar berulang-ulang tanpa menghabiskan kuota AI">
                  <Database size={10} />
                  <span>Tersimpan di Database</span>
                </span>
              )}
              {isPlaying && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <Sparkles size={10} />
                  <span>{activeProviderName}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-[#9C948A] mt-0.5">
              {isLoading ? (
                <span className="text-[#E8B33D] font-bold flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" />
                  Meracik ulasan & langsung mengunggah ke database Firestore...
                </span>
              ) : isPlaying ? (
                <span className="text-[#E8B33D] font-bold flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    <span className="h-2 w-0.5 animate-pulse bg-[#E8B33D] rounded-full" />
                    <span className="h-3.5 w-0.5 animate-pulse delay-75 bg-[#E8B33D] rounded-full" />
                    <span className="h-2.5 w-0.5 animate-pulse delay-150 bg-[#E8B33D] rounded-full" />
                  </span>
                  Sedang membaca highlight analisis dengan intonasi caster turnamen...
                </span>
              ) : isPaused ? (
                <span className="text-amber-400 font-semibold">Suara komentator sedang dijeda</span>
              ) : isStoredInDb ? (
                <span className="text-cyan-300 font-medium flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-cyan-400" />
                  Audio sudah tersimpan di database! Klik untuk putar seketika tanpa kuota AI.
                </span>
              ) : isUnderLimit ? (
                <span className="text-amber-400 font-medium">
                  Kapasitas generate sedang limit. Siap kembali dalam {secondsLeft} detik.
                </span>
              ) : (
                <span>Vokal manusia asli turnamen. Tersimpan otomatis di database saat dibuat.</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isLoading ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 rounded-xl bg-[#251F1B] border border-[#332C25] px-4 py-2 text-xs font-bold text-[#9C948A]"
            >
              <Loader2 size={14} className="animate-spin text-[#E8B33D]" />
              <span>Memproses Suara...</span>
            </button>
          ) : isPlaying ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-1.5 rounded-xl border border-[#E8B33D]/50 bg-[#251F1B] hover:bg-[#2F2722] px-3.5 py-2 text-xs font-bold text-[#E8B33D] cursor-pointer"
                title="Jeda"
              >
                <Pause size={13} />
                <span>Jeda</span>
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-[#251717] hover:bg-rose-950/60 px-3.5 py-2 text-xs font-bold text-rose-300 cursor-pointer"
                title="Stop"
              >
                <Square size={13} fill="currentColor" />
                <span>Stop</span>
              </button>
            </div>
          ) : isPaused ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePlay()}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E8B33D] to-[#D97706] px-4 py-2 text-xs font-black text-[#161311] hover:brightness-110 active:scale-95 cursor-pointer shadow-md shadow-[#E8B33D]/20"
              >
                <Play size={13} fill="currentColor" />
                <span>Lanjutkan</span>
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1 rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-xs font-bold text-[#9C948A] hover:text-rose-400 cursor-pointer"
              >
                <Square size={12} fill="currentColor" />
                <span>Stop</span>
              </button>
            </div>
          ) : isUnderLimit ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled
                className="flex items-center gap-2 rounded-xl bg-[#281A10] border border-amber-600/40 px-4 py-2.5 text-xs font-bold text-amber-400 opacity-80 cursor-not-allowed"
                title={`Kapasitas AI Caster sedang limit. Silakan tunggu estimasi ${secondsLeft} detik lagi`}
              >
                <Clock size={14} className="animate-spin text-amber-400" />
                <span>Limit ({secondsLeft}s)</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePlay()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8B33D] via-[#F59E0B] to-[#D97706] px-5 py-2.5 text-xs font-black text-[#161311] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#E8B33D]/25 cursor-pointer uppercase tracking-wider"
              >
                <Play size={14} fill="currentColor" />
                <span>{isStoredInDb ? 'Putar Audio (DB)' : 'Dengarkan Suara Caster'}</span>
              </button>

              {isStoredInDb && (
                <button
                  type="button"
                  onClick={() => handlePlay(undefined, true)}
                  className="rounded-xl border border-[#332C25] bg-[#161311] hover:border-[#E8B33D]/50 hover:text-[#E8B33D] p-2.5 text-xs text-[#9C948A] transition-all cursor-pointer"
                  title="Generate ulang audio baru dan simpan kembali ke database"
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle row: Mode Switcher (Lengkap vs Recap 25s) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#332C25]/60 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-[#9C948A]">Durasi Ulasan:</span>
          <div className="inline-flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#161311] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setCommentaryMode('full');
                if (isPlaying) handleStop();
              }}
              className={`rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer ${
                commentaryMode === 'full'
                  ? 'bg-[#E8B33D] text-[#161311] shadow'
                  : 'text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
              title="Mendengarkan seluruh analisis pertandingan secara utuh tanpa ada kalimat yang terpotong"
            >
              📖 Ulasan Lengkap (Semua Kalimat)
            </button>
            <button
              type="button"
              onClick={() => {
                setCommentaryMode('recap');
                if (isPlaying) handleStop();
              }}
              className={`rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer ${
                commentaryMode === 'recap'
                  ? 'bg-[#E8B33D] text-[#161311] shadow'
                  : 'text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
              title="Highlight cepat ~25 detik yang berfokus pada pembuka match, MVP & momen roasting terbaik"
            >
              ⚡ Hype Recap (~25 Detik)
            </button>
          </div>
        </div>

        <span className="text-[10px] text-[#9C948A] flex items-center gap-1">
          {commentaryMode === 'full' ? (
            <span className="text-[#E8B33D]">✨ Dirangkai utuh tanpa terpotong</span>
          ) : (
            <span className="text-amber-400">🔥 Versi ringkas super cepat</span>
          )}
        </span>
      </div>

      {/* Bottom row: Single Caster Profile & Multi-Tier AI Guarantee Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#332C25]/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2E241B] border border-[#E8B33D]/40 text-sm">
            {MAIN_CASTER.avatarEmoji}
          </span>
          <span className="font-bold text-[#F2EDE4] text-xs">
            {MAIN_CASTER.name}
          </span>
          <span className="text-[11px] text-[#9C948A] hidden sm:inline">
            — {MAIN_CASTER.tagline}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#9C948A]">
          <div className="flex items-center gap-1 text-cyan-400 font-semibold">
            <Database size={12} className="shrink-0" />
            <span>Simpan Otomatis ke Database</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
            <span>100% Suara Alami (Bebas Robot)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
