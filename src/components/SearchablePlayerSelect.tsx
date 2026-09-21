import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, User } from 'lucide-react';
import { Player } from '../types';
import { PlayerAvatar } from './PlayerAvatar';

interface SearchablePlayerSelectProps {
  players: Player[];
  selectedPlayerName: string;
  onSelectPlayer: (playerName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const SearchablePlayerSelect: React.FC<SearchablePlayerSelectProps> = ({
  players,
  selectedPlayerName,
  onSelectPlayer,
  placeholder = '-- Cari & Pilih Pemain --',
  disabled = false,
  className = '',
  id = 'searchable-player-select',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input and reset highlight when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Selected player object
  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerName) return null;
    return players.find(
      (p) => p.name.trim().toLowerCase() === selectedPlayerName.trim().toLowerCase()
    );
  }, [players, selectedPlayerName]);

  // Filtered players list
  const filteredPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return players;

    return players.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(term);
      const tierMatch = p.tier ? p.tier.toLowerCase().includes(term) : false;
      const statusMatch = p.status ? p.status.toLowerCase().includes(term) : false;
      return nameMatch || tierMatch || statusMatch;
    });
  }, [players, searchTerm]);

  // Keep highlighted index in range
  useEffect(() => {
    if (highlightedIndex >= filteredPlayers.length) {
      setHighlightedIndex(Math.max(0, filteredPlayers.length - 1));
    }
  }, [filteredPlayers.length, highlightedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listContainerRef.current) return;
    const highlightedEl = listContainerRef.current.querySelector(
      `[data-player-index="${highlightedIndex}"]`
    ) as HTMLElement | null;
    if (highlightedEl) {
      highlightedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (filteredPlayers.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev - 1 < 0 ? Math.max(0, filteredPlayers.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filteredPlayers[highlightedIndex];
      if (chosen) {
        onSelectPlayer(chosen.name);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const getTierBadgeColor = (tier: string = '') => {
    const t = tier.toLowerCase();
    if (t.includes('immortal')) return 'text-amber-300 bg-amber-950/60 border-amber-500/40';
    if (t.includes('glory') || t.includes('honor') || t.includes('mythic'))
      return 'text-rose-300 bg-rose-950/60 border-rose-500/40';
    if (t.includes('legend')) return 'text-[#E8B33D] bg-[#E8B33D]/15 border-[#E8B33D]/40';
    if (t.includes('epic')) return 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40';
    return 'text-[#9C948A] bg-[#241F1B] border-[#332C25]';
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-xl bg-[#161311] border px-3.5 py-2.5 text-sm text-[#F2EDE4] transition-all cursor-pointer text-left focus:outline-none ${
          isOpen
            ? 'border-[#E8B33D] ring-1 ring-[#E8B33D]'
            : 'border-[#332C25] hover:border-[#E8B33D]/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedPlayer ? (
            <>
              <PlayerAvatar
                name={selectedPlayer.name}
                avatarUrl={selectedPlayer.avatar_url}
                status={selectedPlayer.status}
                tier={selectedPlayer.tier}
                size="sm"
                className="shrink-0 ring-1 ring-[#E8B33D]/30"
              />
              <span className="font-bold text-sm text-[#F2EDE4] truncate">
                {selectedPlayer.name}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${getTierBadgeColor(
                  selectedPlayer.tier
                )}`}
              >
                {selectedPlayer.tier || 'Warrior'}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[#9C948A]">
              <Search size={16} className="text-[#9C948A] shrink-0" />
              <span className="text-sm font-medium">{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[#9C948A]">
          {selectedPlayer && (
            <span
              role="button"
              tabIndex={0}
              title="Ganti atau bersihkan pilihan"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlayer('');
                setIsOpen(true);
              }}
              className="p-1 hover:text-[#F2EDE4] rounded hover:bg-[#2A241E] transition-colors cursor-pointer"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#E8B33D]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          id={`${id}-dropdown`}
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-[#3D352E] bg-[#1A1614] shadow-2xl shadow-black/80 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-[#332C25] bg-[#241F1B]/70">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E8B33D] pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Cari nama atau tier pemain..."
                className="w-full rounded-lg bg-[#161311] border border-[#3D352E] pl-9 pr-8 py-2 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none focus:ring-1 focus:ring-[#E8B33D]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4] p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-[#9C948A]">
              <span>Pilih nama Anda:</span>
              <span className="font-semibold text-[#E8B33D]">
                {filteredPlayers.length} pemain
              </span>
            </div>
          </div>

          {/* List of Players */}
          <div
            ref={listContainerRef}
            className="max-h-60 overflow-y-auto divide-y divide-[#2A241E]/40 p-1"
          >
            {filteredPlayers.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="h-10 w-10 mx-auto rounded-full bg-[#241F1B] border border-[#332C25] flex items-center justify-center text-[#9C948A] mb-2">
                  <User size={18} />
                </div>
                <p className="text-xs font-semibold text-[#F2EDE4]">
                  Nama tidak ditemukan
                </p>
                <p className="text-[11px] text-[#9C948A] mt-0.5">
                  Tidak ada pemain yang cocok dengan "{searchTerm}"
                </p>
              </div>
            ) : (
              filteredPlayers.map((player, index) => {
                const isSelected =
                  selectedPlayerName.trim().toLowerCase() ===
                  player.name.trim().toLowerCase();
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={player.id}
                    type="button"
                    data-player-index={index}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      onSelectPlayer(player.name);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8B33D]/15 text-[#F2EDE4]'
                        : isHighlighted
                        ? 'bg-[#2A241E] text-[#F2EDE4]'
                        : 'text-[#F2EDE4]/90 hover:bg-[#241F1B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <PlayerAvatar
                        name={player.name}
                        avatarUrl={player.avatar_url}
                        status={player.status}
                        tier={player.tier}
                        size="sm"
                        className="shrink-0 ring-1 ring-[#3D352E]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-[#E8B33D]' : 'text-[#F2EDE4]'
                            }`}
                          >
                            {player.name}
                          </span>
                          {player.status === 'Cabutan' && (
                            <span className="text-[9px] px-1 rounded bg-[#2A241E] text-[#9C948A] border border-[#332C25]">
                              Cabutan
                            </span>
                          )}
                        </div>
                        {player.julukan && (
                          <p className="text-[10px] text-[#9C948A] truncate">
                            {player.julukan}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getTierBadgeColor(
                          player.tier
                        )}`}
                      >
                        {player.tier || 'Warrior'}
                      </span>
                      {isSelected ? (
                        <Check size={16} className="text-[#E8B33D] shrink-0" />
                      ) : (
                        <div className="w-4 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
