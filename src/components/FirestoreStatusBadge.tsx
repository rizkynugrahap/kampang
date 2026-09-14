import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, Cloud, X, AlertCircle, Copy, ExternalLink, ShieldAlert } from 'lucide-react';
import { firebaseConfig } from '../lib/firebase';
import { forceSyncAllToFirestore } from '../services/firestoreSync';
import { Player, Match, LagaAmalSeasonData } from '../types';

const RECOMMENDED_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

interface FirestoreStatusBadgeProps {
  players: Player[];
  matches: Match[];
  seasons: LagaAmalSeasonData[];
  isConnected: boolean;
  lastSyncedAt: Date | null;
  onSyncSuccess?: () => void;
}

export const FirestoreStatusBadge: React.FC<FirestoreStatusBadgeProps> = ({
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
  const [copied, setCopied] = useState(false);
  const [showRulesGuide, setShowRulesGuide] = useState(false);

  const handleCopyRules = () => {
    navigator.clipboard.writeText(RECOMMENDED_RULES);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await forceSyncAllToFirestore({
        players,
        matches,
        seasons,
      });
      setSyncMessage('Berhasil menyinkronkan seluruh database ke Cloud Firestore!');
      setShowRulesGuide(false);
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('permission') || errMsg.includes('insufficient')) {
        setSyncMessage('Izin ditolak (Missing or insufficient permissions). Pastikan aturan keamanan (Rules) di Firebase Console sudah di-publish.');
        setShowRulesGuide(true);
      } else {
        setSyncMessage(`Gagal sinkronisasi: ${errMsg}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const activeSeason = seasons[0];

  return (
    <>
      <button
        id="btn-firestore-status"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:border-amber-400 hover:bg-amber-500/20 transition-all"
        title="Status Cloud Firestore Database"
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
        <Cloud size={13} className="text-amber-400" />
        <span className="hidden sm:inline">Firestore Live</span>
      </button>

      {/* Modal Detail Firestore */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F2EDE4] flex items-center gap-1.5">
                    Cloud Firestore Database
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Tersambung
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#9C948A]">
                    Penyimpanan persisten real-time Laga Amal Pantos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-[#332C25] bg-[#161311] p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Firebase Project:</span>
                <span className="font-mono text-[#F2EDE4] font-semibold">{firebaseConfig.projectId}</span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Firestore Database:</span>
                <span className="font-mono text-[#E8B33D] font-semibold text-[11px] truncate max-w-[200px]" title={firebaseConfig.firestoreDatabaseId}>
                  {firebaseConfig.firestoreDatabaseId || '(default)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Status Realtime:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> onSnapshot Aktif
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
                <div className="text-base font-bold text-[#E8B33D]">{players.length}</div>
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
                  syncMessage.includes('Gagal') || syncMessage.includes('Izin ditolak')
                    ? 'bg-rose-950/50 border border-rose-800/40 text-rose-300'
                    : 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-300'
                }`}
              >
                {syncMessage.includes('Gagal') || syncMessage.includes('Izin ditolak') ? (
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                )}
                <span>{syncMessage}</span>
              </div>
            )}

            {/* Rules Helper Section */}
            {(showRulesGuide || syncMessage?.includes('Izin ditolak')) && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-2.5 text-xs text-[#E8DCCB]">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <ShieldAlert size={16} />
                  <span>Aturan Keamanan (Firestore Rules) untuk Project Ini:</span>
                </div>
                <p className="text-[11px] text-[#C5BCAD]">
                  Karena project <strong>{firebaseConfig.projectId}</strong> adalah project Firebase pribadi Anda, pastikan aturan keamanan di Firebase Console mengizinkan read & write:
                </p>
                <div className="relative">
                  <pre className="rounded-lg bg-[#141210] p-2.5 font-mono text-[11px] text-amber-200 overflow-x-auto border border-[#332C25]">
                    {RECOMMENDED_RULES}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className="absolute top-2 right-2 flex items-center gap-1 rounded bg-[#251E17] hover:bg-[#332C25] border border-amber-500/30 px-2 py-1 text-[10px] font-semibold text-amber-300 cursor-pointer"
                  >
                    <Copy size={11} />
                    {copied ? 'Tersalin!' : 'Salin Rules'}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#9C948A]">Buka tab Rules di Console:</span>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline font-semibold"
                  >
                    Buka Firebase Console Rules <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowRulesGuide(!showRulesGuide)}
                className="w-full sm:w-auto text-xs text-amber-400/80 hover:text-amber-300 underline py-1 cursor-pointer text-left sm:text-center"
              >
                {showRulesGuide ? 'Sembunyikan Panduan Rules' : 'Lihat Aturan Security Rules'}
              </button>
              <button
                id="btn-trigger-manual-firestore-sync"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#E8B33D] px-4 py-2.5 text-xs font-bold text-[#161311] hover:bg-[#F3C256] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
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
