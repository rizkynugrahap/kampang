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
} from 'lucide-react';
import {
  commentatorAudio,
  CASTER_PERSONAS,
  CasterVoiceId,
} from '../utils/commentatorAudio';

interface MatchCommentatorPlayerProps {
  analysisText: string;
  variant?: 'compact' | 'full';
  matchTitle?: string;
  className?: string;
}

export const MatchCommentatorPlayer: React.FC<MatchCommentatorPlayerProps> = ({
  analysisText,
  variant = 'full',
  matchTitle,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<CasterVoiceId>('Puck');
  const [commentaryMode, setCommentaryMode] = useState<'full' | 'recap'>('full');
  const [isAiAudioSource, setIsAiAudioSource] = useState(true);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        commentatorAudio.stop();
      }
    };
  }, [isPlaying]);

  const handlePlay = (overrideMode?: 'full' | 'recap') => {
    if (!analysisText || isLoading) return;

    if (isPaused) {
      commentatorAudio.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const activeMode = overrideMode || commentaryMode;
    setIsLoading(true);

    commentatorAudio.playCasterCommentary(analysisText, {
      voice: selectedVoice,
      mode: activeMode,
      onLoading: () => {
        setIsLoading(true);
      },
      onStart: (isAiAudio) => {
        setIsLoading(false);
        setIsPlaying(true);
        setIsPaused(false);
        setIsAiAudioSource(isAiAudio);
      },
      onEnd: () => {
        setIsLoading(false);
        setIsPlaying(false);
        setIsPaused(false);
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

  const handleVoiceChange = (voiceId: CasterVoiceId) => {
    setSelectedVoice(voiceId);
    if (isPlaying) {
      handleStop();
    }
  };

  if (!analysisText) return null;

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
        ) : (
          <button
            type="button"
            onClick={() => handlePlay()}
            className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/50 bg-gradient-to-r from-[#2A2118] to-[#1E1712] hover:border-[#E8B33D] px-2.5 py-1 text-[11px] font-bold text-[#E8B33D] transition-all cursor-pointer shadow-xs active:scale-95 hover:brightness-110"
            title="Dengarkan ulasan highlight ini dengan suara caster esports asli (Gemini Neural Voice)"
          >
            <Radio size={12} className="text-[#E8B33D]" />
            <span>🎙️ Suara Caster AI</span>
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

      {/* Top row: Status, Tag, and Main Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#332C25]/80 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
              isPlaying
                ? 'border-[#E8B33D] bg-[#E8B33D]/20 text-[#E8B33D] shadow-lg shadow-[#E8B33D]/25'
                : 'border-[#332C25] bg-[#161311] text-[#9C948A]'
            }`}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin text-[#E8B33D]" />
            ) : isPlaying ? (
              <Radio size={18} className="animate-pulse text-[#E8B33D]" />
            ) : (
              <Mic size={18} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black uppercase tracking-wide text-[#F2EDE4] flex items-center gap-1.5">
                <span>🎙️ Caster Esports MLBB</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8B33D]/15 border border-[#E8B33D]/40 px-2 py-0.5 text-[10px] font-black text-[#E8B33D]">
                <Sparkles size={10} />
                <span>AI Neural Voice</span>
              </span>
            </div>

            <p className="text-xs text-[#9C948A] mt-0.5">
              {isLoading ? (
                <span className="text-[#E8B33D] font-bold flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" />
                  Membuat suara caster turnamen yang natural & ekspresif...
                </span>
              ) : isPlaying ? (
                <span className="text-[#E8B33D] font-bold flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    <span className="h-2 w-0.5 animate-pulse bg-[#E8B33D] rounded-full" />
                    <span className="h-3.5 w-0.5 animate-pulse delay-75 bg-[#E8B33D] rounded-full" />
                    <span className="h-2.5 w-0.5 animate-pulse delay-150 bg-[#E8B33D] rounded-full" />
                  </span>
                  Sedang membaca highlight analisis dengan intonasi caster...
                </span>
              ) : isPaused ? (
                <span className="text-amber-400 font-semibold">Suara komentator sedang dijeda</span>
              ) : (
                <span>Gaya bicara alami & ekspresif ala caster MPL, bukan robot monoton</span>
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
              <span>Memproses...</span>
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
          ) : (
            <button
              type="button"
              onClick={() => handlePlay()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8B33D] via-[#F59E0B] to-[#D97706] px-5 py-2.5 text-xs font-black text-[#161311] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#E8B33D]/25 cursor-pointer uppercase tracking-wider"
            >
              <Play size={14} fill="currentColor" />
              <span>Dengarkan Suara Caster</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle row: Mode Switcher (Lengkap vs Recap 25s) */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#332C25]/60 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-[#9C948A]">Mode Ulasan:</span>
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
              📖 Ulasan Lengkap
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

        <span className="text-[10px] text-[#9C948A]">
          {commentaryMode === 'full' ? '✨ Otomatis dirangkai utuh tanpa terpotong' : '🔥 Versi ringkas super cepat'}
        </span>
      </div>

      {/* Bottom row: Caster Persona Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#332C25]/40 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9C948A]">
          Pilih Karakter Caster:
        </span>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
          {CASTER_PERSONAS.map((persona) => {
            const isSelected = selectedVoice === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => handleVoiceChange(persona.id)}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#E8B33D] bg-[#2E241B] text-[#E8B33D] shadow-sm ring-1 ring-[#E8B33D]/40'
                    : 'border-[#332C25] bg-[#161311] text-[#9C948A] hover:text-[#F2EDE4] hover:border-[#4A3F35]'
                }`}
                title={persona.tagline}
              >
                <span>{persona.avatarEmoji}</span>
                <span>{persona.name.split(' ')[1]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
