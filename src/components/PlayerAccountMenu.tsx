import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, LogOut, ChevronDown } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerAuth } from '../contexts/PlayerAuthContext';

interface PlayerAccountMenuProps {
  className?: string;
  /** Compact mode hides the name/tier text and only shows the avatar + chevron — used in tight spaces. */
  compact?: boolean;
}

/**
 * One canonical login/logout control for the whole app. Logged out, it's a
 * single "Login Pemain" button. Logged in, it's an avatar chip that opens a
 * small dropdown with "Ubah PIN" and "Keluar" — replacing what used to be
 * several separate always-visible icon buttons scattered across the chat
 * topbar.
 */
export const PlayerAccountMenu: React.FC<PlayerAccountMenuProps> = ({
  className = '',
  compact = false,
}) => {
  const { session, isLoggedIn, openLogin, openChangePin, logout } = usePlayerAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  if (!isLoggedIn || !session) {
    return (
      <button
        id="btn-player-account-login"
        onClick={() => openLogin()}
        className={`flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer min-h-[38px] ${className}`}
        title="Login akun pemain — untuk chat & ubah profil sendiri"
      >
        <KeyRound size={14} />
        <span className={compact ? 'hidden sm:inline' : ''}>Login Pemain</span>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        id="btn-player-account-menu"
        onClick={() => setIsMenuOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border transition-colors cursor-pointer min-h-[38px] px-1.5 py-1 sm:px-2 ${
          isMenuOpen
            ? 'border-[#E8B33D]/60 bg-[#2A241E]'
            : 'border-[#332C25] bg-[#241F1B] hover:border-[#E8B33D]/40 hover:bg-[#2A241E]'
        }`}
        title={session.playerName}
      >
        <PlayerAvatar name={session.playerName} avatarUrl={session.avatar_url} size="xs" />
        {!compact && (
          <div className="hidden sm:flex flex-col min-w-0 max-w-[110px] items-start">
            <span className="text-xs font-bold text-[#F2EDE4] truncate leading-none">
              {session.playerName}
            </span>
            <span className="text-[9px] text-[#E8B33D] truncate mt-0.5 font-medium">
              {session.tier || 'Player'}
            </span>
          </div>
        )}
        <ChevronDown
          size={14}
          className={`text-[#9C948A] shrink-0 transition-transform duration-150 ${
            isMenuOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isMenuOpen && (
        <div
          id="player-account-dropdown"
          className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-[#3D352E] bg-[#1A1614] shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3.5 py-3 border-b border-[#332C25] bg-[#241F1B]/70">
            <p className="text-xs font-bold text-[#F2EDE4] truncate">{session.playerName}</p>
            <p className="text-[10px] text-[#9C948A] truncate mt-0.5">
              Akun Pemain • {session.tier || 'Player'}
            </p>
          </div>
          <button
            id="menu-item-change-pin"
            onClick={() => {
              setIsMenuOpen(false);
              openChangePin();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-[#F2EDE4] hover:bg-[#241F1B] transition-colors cursor-pointer"
          >
            <KeyRound size={14} className="text-[#9C948A]" />
            <span>Ubah PIN</span>
          </button>
          <button
            id="menu-item-logout"
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  );
};
