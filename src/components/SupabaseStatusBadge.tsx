import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, Cloud, X, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import { SUPABASE_URL } from '../lib/supabase';
import { forceSyncAllToSupabase } from '../services/supabaseSync';
import { Player, Match, LagaAmalSeasonData } from '../types';

interface SupabaseStatusBadgeProps {
  players: Player[];
  matches: Match[];
  seasons: LagaAmalSeasonData[];
  isConnected: boolean;
  lastSyncedAt: Date | null;
  onSyncSuccess?: () => void;
}

export const SupabaseStatusBadge: React.FC<SupabaseStatusBadgeProps> = ({
  players,
  matches,
  seasons,
  isConnected,
  lastSyncedAt,
  onSyncSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await forceSyncAllToSupabase({
        players,
        matches,
        seasons,
      });
      setSyncMessage('Berhasil menyinkronkan seluruh database ke Supabase!');
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setSyncMessage(`Gagal sinkronisasi: ${errMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const projectDomain = SUPABASE_URL.replace('https://', '').split('.')[0];

  return (
    <>
      <button
        id="btn-firestore-status"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
        title="Status Database Supabase (PostgreSQL & Realtime)"
      >
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          ></span>
        </span>
        <Zap size={13} className="text-emerald-400 fill-emerald-400/30" />
        <span className="hidden sm:inline">Supabase Live</span>
      </button>

      {/* Modal Detail Supabase */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F2EDE4] flex items-center gap-1.5">
                    Supabase Database
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Tersambung
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#9C948A]">
                    PostgreSQL & Realtime Sync Laga Amal Pantos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-[#332C25] bg-[#161311] p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Supabase Project:</span>
                <span className="font-mono text-emerald-300 font-semibold text-[11px]">
                  {projectDomain}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Endpoint URL:</span>
                <span
                  className="font-mono text-[#E8B33D] font-semibold text-[11px] truncate max-w-[200px]"
                  title={SUPABASE_URL}
                >
                  {SUPABASE_URL}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Status Realtime:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> postgres_changes Aktif
                </span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Terakhir Disinkronkan:</span>
                <span className="text-[#C5BCAD]">
                  {lastSyncedAt ? lastSyncedAt.toLocaleTimeString('id-ID') : 'Baru saja'}
                </span>
              </div>
            </div>

            {/* Stat counts */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-[#251E17] p-2 border border-[#332C25]">
                <div className="text-base font-bold text-emerald-400">{players.length}</div>
                <div className="text-[10px] text-[#9C948A]">Pemain</div>
              </div>
              <div className="rounded-lg bg-[#251E17] p-2 border border-[#332C25]">
                <div className="text-base font-bold text-[#F2EDE4]">{matches.length}</div>
                <div className="text-[10px] text-[#9C948A]">Pertandingan</div>
              </div>
              <div className="rounded-lg bg-[#251E17] p-2 border border-[#332C25]">
                <div className="text-base font-bold text-amber-400">{seasons.length}</div>
                <div className="text-[10px] text-[#9C948A]">Musim / Season</div>
              </div>
            </div>

            {syncMessage && (
              <div
                className={`rounded-lg p-3 text-xs flex items-start gap-2.5 ${
                  syncMessage.includes('Gagal')
                    ? 'bg-rose-950/50 border border-rose-800/40 text-rose-300'
                    : 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-300'
                }`}
              >
                {syncMessage.includes('Gagal') ? (
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                )}
                <span>{syncMessage}</span>
              </div>
            )}

            {/* Tables Checklist */}
            <div className="rounded-xl border border-[#332C25] bg-[#161311] p-3 space-y-1.5 text-xs text-[#9C948A]">
              <div className="text-[11px] font-semibold text-[#F2EDE4] mb-1">Tabel Supabase Terintegrasi:</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={12} /> <span>public.players</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={12} /> <span>public.matches</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={12} /> <span>public.laga_amal_seasons</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={12} /> <span>public.app_meta</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 col-span-2">
                  <CheckCircle2 size={12} /> <span>public.admins</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 underline py-1"
              >
                Buka Dashboard Supabase <ExternalLink size={12} />
              </a>
              <button
                id="btn-trigger-manual-firestore-sync"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-xs font-bold text-[#161311] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Menyinkronkan ke Cloud...' : 'Upload & Sinkronkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
