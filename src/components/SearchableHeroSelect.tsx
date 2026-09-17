import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { Hero } from '../types';
import { HeroAvatar } from './HeroAvatar';

interface SearchableHeroSelectProps {
  heroes: Hero[];
  selectedHero: string;
  onSelectHero: (heroName: string) => void;
  disabled?: boolean;
  className?: string;
}

const ROLES = ['Semua', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'] as const;

export const SearchableHeroSelect: React.FC<SearchableHeroSelectProps> = ({
  heroes,
  selectedHero,
  onSelectHero,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('Semua');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter heroes based on search and role
  const filteredHeroes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return heroes.filter((h) => {
      const matchName = h.name.toLowerCase().includes(term);
      const matchRole =
        selectedRole === 'Semua' ||
        h.role_primary?.toLowerCase() === selectedRole.toLowerCase() ||
        h.role_secondary?.toLowerCase() === selectedRole.toLowerCase();
      return matchName && matchRole;
    });
  }, [heroes, searchTerm, selectedRole]);

  const currentHeroObj = heroes.find(
    (h) => h.name.toLowerCase() === selectedHero.toLowerCase()
  );

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border border-[#332C25] bg-[#161311] px-2.5 py-1 text-xs text-[#F2EDE4] transition-all cursor-pointer hover:border-[#E8B33D]/60 focus:border-[#E8B33D] focus:outline-none min-w-[130px] max-w-[160px] justify-between ${
          isOpen ? 'ring-1 ring-[#E8B33D] border-[#E8B33D]' : ''
        }`}
        title={`Hero: ${selectedHero}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <HeroAvatar heroName={selectedHero} size="xs" shape="circle" />
          <span className="font-semibold text-xs truncate max-w-[85px]">
            {selectedHero || 'Pilih Hero'}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`shrink-0 text-[#9C948A] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#E8B33D]' : ''
          }`}
        />
      </button>

      {/* Searchable Dropdown Overlay */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 rounded-xl border border-[#3D352E] bg-[#1A1614] p-2.5 shadow-2xl shadow-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C948A]" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari hero MLBB..."
              className="w-full rounded-lg border border-[#332C25] bg-[#120F0D] pl-8 pr-7 py-1.5 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
                if (e.key === 'Enter' && filteredHeroes.length > 0) {
                  onSelectHero(filteredHeroes[0].name);
                  setIsOpen(false);
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4]"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Role Filter Chips */}
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none mb-1">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  selectedRole === role
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'bg-[#241F1B] text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Hero List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin scrollbar-thumb-[#332C25]">
            {filteredHeroes.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9C948A]">
                Hero "{searchTerm}" tidak ditemukan
              </div>
            ) : (
              filteredHeroes.map((hero) => {
                const isSelected =
                  hero.name.toLowerCase() === selectedHero.toLowerCase();
                return (
                  <button
                    key={`hero-item-${hero.id || hero.name}`}
                    type="button"
                    onClick={() => {
                      onSelectHero(hero.name);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8B33D]/20 text-[#E8B33D] font-bold'
                        : 'text-[#F2EDE4] hover:bg-[#241F1B]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <HeroAvatar heroName={hero.name} size="xs" shape="circle" />
                      <div className="flex flex-col truncate">
                        <span className="font-semibold truncate">{hero.name}</span>
                        {hero.role_primary && (
                          <span className="text-[9px] text-[#9C948A]">
                            {hero.role_primary}
                            {hero.role_secondary ? ` / ${hero.role_secondary}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-[#E8B33D] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Counter */}
          <div className="mt-2 pt-2 border-t border-[#332C25] flex items-center justify-between text-[10px] text-[#9C948A]">
            <span>Menampilkan {filteredHeroes.length} hero</span>
            {currentHeroObj?.role_primary && (
              <span className="text-[#E8B33D] font-medium">
                Pilihan: {selectedHero} ({currentHeroObj.role_primary})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
