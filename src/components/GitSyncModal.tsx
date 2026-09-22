import React, { useState } from 'react';
import { GitBranch, GitCommit, GitPullRequest, ExternalLink, Download, Copy, Check, ShieldCheck, Database, X } from 'lucide-react';
import { Player, Match, Season } from '../types';

interface GitSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  matches: Match[];
  seasons: Season[];
  activeSeason: Season | null;
}

export const GitSyncModal: React.FC<GitSyncModalProps> = ({
  isOpen,
  onClose,
  players,
  matches,
  seasons,
  activeSeason,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const repoName = 'rizkynugrahap/kampang';
  const branchName = 'main';
  const repoUrl = `https://github.com/${repoName}`;

  if (!isOpen) return null;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadJson = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      repository: repoName,
      branch: branchName,
      activeSeason: activeSeason?.title || 'Unknown',
      summary: {
        totalPlayers: players.length,
        totalMatches: matches.length,
        totalSeasons: seasons.length,
      },
      players,
      matches,
      seasons,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `git-backup-${repoName.replace('/', '-')}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateGitCommitMessage = () => {
    const seasonName = activeSeason?.title || 'Season';
    return `chore(tournament): update ${seasonName} data (${matches.length} matches, ${players.length} players) [auto-sync]`;
  };

  return (
    <div
      id="git-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="git-sync-modal-card"
        className="relative w-full max-w-lg rounded-2xl border border-[#3D352E] bg-[#1D1916] p-5 sm:p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#332C25]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8B33D]/15 text-[#E8B33D] border border-[#E8B33D]/30">
              <GitBranch size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F2EDE4] flex items-center gap-2">
                Fitur Git & Repository
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8B33D]/20 text-[#E8B33D] font-mono border border-[#E8B33D]/40">
                  {branchName}
                </span>
              </h3>
              <p className="text-xs text-[#9C948A]">
                Sinkronisasi, backup data turnamen, dan repositori GitHub
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2F2823] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Repository Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#161311] border border-[#332C25]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <GitCommit size={16} className="text-[#E8B33D]" />
              <span className="font-mono text-xs font-bold text-[#F2EDE4]">
                {repoName}
              </span>
            </div>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E8B33D] hover:underline"
            >
              <span>Buka di GitHub</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#29221D] text-center">
            <div className="p-2 rounded-lg bg-[#241F1B]/60">
              <span className="block text-xs font-bold text-[#F2EDE4]">{players.length}</span>
              <span className="text-[10px] text-[#9C948A]">Pemain</span>
            </div>
            <div className="p-2 rounded-lg bg-[#241F1B]/60">
              <span className="block text-xs font-bold text-[#E8B33D]">{matches.length}</span>
              <span className="text-[10px] text-[#9C948A]">Match</span>
            </div>
            <div className="p-2 rounded-lg bg-[#241F1B]/60">
              <span className="block text-xs font-bold text-emerald-400">
                {activeSeason?.title || 'Active'}
              </span>
              <span className="text-[10px] text-[#9C948A]">Season Aktif</span>
            </div>
          </div>
        </div>

        {/* Git Actions */}
        <div className="mt-4 space-y-2.5">
          {/* Export JSON for Git */}
          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center justify-between w-full p-3 rounded-xl bg-[#241F1B] hover:bg-[#2D2520] border border-[#332C25] hover:border-[#E8B33D]/50 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#161311] text-[#E8B33D] border border-[#332C25]">
                <Download size={15} />
              </div>
              <div>
                <span className="text-xs font-bold text-[#F2EDE4] block group-hover:text-[#E8B33D] transition-colors">
                  Download Git Snapshot (JSON)
                </span>
                <span className="text-[10px] text-[#9C948A] block">
                  Export data lengkap pertandingan untuk commit ke repo
                </span>
              </div>
            </div>
            <span className="text-xs text-[#E8B33D] font-mono">.json</span>
          </button>

          {/* Copy Commit Message */}
          <div className="p-3 rounded-xl bg-[#241F1B] border border-[#332C25]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#F2EDE4] flex items-center gap-1.5">
                <GitPullRequest size={13} className="text-[#E8B33D]" />
                Commit Message Generator
              </span>
              <button
                type="button"
                onClick={() => handleCopy(generateGitCommitMessage(), 'commit')}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#161311] border border-[#332C25] text-[#E8B33D] hover:bg-[#2F2823] cursor-pointer"
              >
                {copiedType === 'commit' ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-[#9C948A] bg-[#161311] p-2 rounded-lg select-all border border-[#2B231D] break-all">
              {generateGitCommitMessage()}
            </p>
          </div>
        </div>

        {/* System & DB Sync status */}
        <div className="mt-4 pt-3 border-t border-[#332C25] flex items-center justify-between text-[11px] text-[#9C948A]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck size={13} />
            <span>Cloud & Git Data Ready</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database size={12} className="text-[#E8B33D]" />
            <span>Firestore + Supabase Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
