import React, { useState, useMemo } from 'react';
import { X, Save, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { Match, MatchPlayerDetail, Medal, Hero, MatchType, Player, LagaAmalSeasonData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { SearchableHeroSelect } from './SearchableHeroSelect';
import { getMatchDisplayNumber, calculateNextMatchNumber } from '../utils/matchSequence';
import { sortSeasonsDescending } from '../utils/seasonCalculations';

const MAX_PLAYERS_PER_TEAM = 5;

export interface EditMatchSaveData {
  id: number;
  matchNumber: number;
  date: string;
  season: string;
  type: MatchType;
  winner: Match['winner'];
  pohon: MatchPlayerDetail[];
  lobby: MatchPlayerDetail[];
}

interface EditMatchModalProps {
  match: Match;
  heroes: Hero[];
  players: Player[];
  seasons: LagaAmalSeasonData[];
  matches: Match[];
  onClose: () => void;
  onSave: (originalMatch: Match, updates: EditMatchSaveData) => Promise<boolean>;
}

type PlayerConfig = { hero: string; medal: Medal; score: number };

const getDefaultScore = (medal: Medal): number => {
  switch (medal) {
    case 'MVP':
      return 10.0;
    case 'Gold':
      return 8.5;
    case 'Silver':
      return 6.0;
    default:
      return 3.5;
  }
};

const toConfig = (p: MatchPlayerDetail): PlayerConfig => ({
  hero: p.hero_name,
  medal: p.medal,
  score: p.score ?? getDefaultScore(p.medal),
});

export const EditMatchModal: React.FC<EditMatchModalProps> = ({
  match,
  heroes,
  players,
  seasons,
  matches,
  onClose,
  onSave,
}) => {
  const sortedSeasons = useMemo(() => sortSeasonsDescending(seasons), [seasons]);
  const originalSeasonId = useMemo(
    () => seasons.find((s) => s.title === match.season)?.id || sortedSeasons[0]?.id || '',
    [seasons, match.season, sortedSeasons]
  );

  const [date, setDate] = useState(match.date);
  const type: MatchType = 'Laga Amal';
  const [winner, setWinner] = useState<Match['winner']>(match.winner);
  const [selectedSeasonId, setSelectedSeasonId] = useState(originalSeasonId);
  const [matchNumber, setMatchNumber] = useState(match.matchNumber || match.id);
  const [pohonNames, setPohonNames] = useState<string[]>(match.pohon.map((p) => p.player_name));
  const [lobbyNames, setLobbyNames] = useState<string[]>(match.lobby.map((p) => p.player_name));
  const [pohonConfig, setPohonConfig] = useState<Record<string, PlayerConfig>>(() =>
    Object.fromEntries(match.pohon.map((p) => [p.player_name, toConfig(p)]))
  );
  const [lobbyConfig, setLobbyConfig] = useState<Record<string, PlayerConfig>>(() =>
    Object.fromEntries(match.lobby.map((p) => [p.player_name, toConfig(p)]))
  );
  const [addPohonName, setAddPohonName] = useState('');
  const [addLobbyName, setAddLobbyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takenNames = useMemo(
    () => new Set([...pohonNames, ...lobbyNames].map((n) => n.toLowerCase())),
    [pohonNames, lobbyNames]
  );
  const availablePlayers = useMemo(
    () => players.filter((p) => !takenNames.has(p.name.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)),
    [players, takenNames]
  );

  const handleSeasonChange = (newSeasonId: string) => {
    setSelectedSeasonId(newSeasonId);
    if (newSeasonId === originalSeasonId) {
      // Moved back to the original season — restore its original number.
      setMatchNumber(match.matchNumber || match.id);
      return;
    }
    // Moving to a different season — this match's old number very likely
    // already belongs to a different match there, so suggest a fresh,
    // guaranteed-free number for the target season (admin can still edit
    // it manually below).
    const suggested = calculateNextMatchNumber(
      matches.filter((m) => m.id !== match.id),
      newSeasonId,
      seasons
    );
    setMatchNumber(suggested);
  };

  const updateConfig = (
    team: 'pohon' | 'lobby',
    name: string,
    field: 'hero' | 'medal' | 'score',
    value: string | number
  ) => {
    const setter = team === 'pohon' ? setPohonConfig : setLobbyConfig;
    setter((prev) => {
      const current = prev[name];
      if (field === 'medal') {
        const newMedal = value as Medal;
        const prevDefault = getDefaultScore(current.medal);
        const nextScore = current.score === prevDefault ? getDefaultScore(newMedal) : current.score;
        return { ...prev, [name]: { ...current, medal: newMedal, score: nextScore } };
      }
      return { ...prev, [name]: { ...current, [field]: value } };
    });
  };

  const removePlayer = (team: 'pohon' | 'lobby', name: string) => {
    if (team === 'pohon') {
      setPohonNames((prev) => prev.filter((n) => n !== name));
      setPohonConfig((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } else {
      setLobbyNames((prev) => prev.filter((n) => n !== name));
      setLobbyConfig((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const addPlayer = (team: 'pohon' | 'lobby') => {
    const name = team === 'pohon' ? addPohonName : addLobbyName;
    if (!name) return;
    const names = team === 'pohon' ? pohonNames : lobbyNames;
    if (names.length >= MAX_PLAYERS_PER_TEAM) {
      setError(`Tim ${team === 'pohon' ? 'Kiri' : 'Kanan'} sudah penuh (maksimal ${MAX_PLAYERS_PER_TEAM} pemain).`);
      return;
    }
    setError(null);
    const defaultConf: PlayerConfig = { hero: heroes[0]?.name || 'Kadita', medal: 'Silver', score: 6.0 };
    if (team === 'pohon') {
      setPohonNames((prev) => [...prev, name]);
      setPohonConfig((prev) => ({ ...prev, [name]: defaultConf }));
      setAddPohonName('');
    } else {
      setLobbyNames((prev) => [...prev, name]);
      setLobbyConfig((prev) => ({ ...prev, [name]: defaultConf }));
      setAddLobbyName('');
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!date.trim()) {
      setError('Tanggal wajib diisi');
      return;
    }
    if (pohonNames.length === 0 || lobbyNames.length === 0) {
      setError('Minimal harus ada 1 pemain di Tim Kiri dan 1 pemain di Tim Kanan.');
      return;
    }
    const targetSeason = seasons.find((s) => s.id === selectedSeasonId);
    if (!targetSeason) {
      setError('Season tujuan tidak ditemukan.');
      return;
    }
    const finalNumber = Math.max(1, Number(matchNumber) || 1);

    const buildDetail = (name: string, team: 'Pohon' | 'Lobby', config: Record<string, PlayerConfig>): MatchPlayerDetail => {
      const conf = config[name];
      const existing = [...match.pohon, ...match.lobby].find(
        (p) => p.player_name.toLowerCase() === name.toLowerCase()
      );
      const player = players.find((p) => p.name.toLowerCase() === name.toLowerCase());
      return {
        id: existing?.id,
        player_id: existing?.player_id ?? player?.id ?? Date.now(),
        player_name: name,
        hero_name: conf.hero,
        team,
        medal: conf.medal,
        score: Number(conf.score) || 0,
      };
    };

    const pohonDetails = pohonNames.map((name) => buildDetail(name, 'Pohon', pohonConfig));
    const lobbyDetails = lobbyNames.map((name) => buildDetail(name, 'Lobby', lobbyConfig));

    setIsSaving(true);
    try {
      const ok = await onSave(match, {
        id: finalNumber,
        matchNumber: finalNumber,
        date: date.trim(),
        season: targetSeason.title,
        type,
        winner,
        pohon: pohonDetails,
        lobby: lobbyDetails,
      });
      if (ok) {
        onClose();
      } else {
        setError('Gagal menyimpan perubahan. Coba lagi.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTeamSection = (
    team: 'pohon' | 'lobby',
    names: string[],
    config: Record<string, PlayerConfig>,
    label: string,
    accentColor: string,
    addName: string,
    setAddName: (v: string) => void
  ) => (
    <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-[#332C25] pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
          <h3 className="font-bold text-xs text-[#F2EDE4] uppercase tracking-wider">{label}</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9C948A]">
          {names.length}/{MAX_PLAYERS_PER_TEAM}
        </span>
      </div>
      <div className="space-y-2.5">
        {names.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#332C25] p-4 text-center text-[11px] text-[#9C948A]">
            Belum ada pemain di tim ini.
          </div>
        )}
        {names.map((name) => {
          const conf = config[name];
          if (!conf) return null;
          return (
            <div
              key={`${team}-${name}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[#332C25] bg-[#241F1B] p-3"
            >
              <div className="flex items-center gap-2">
                <PlayerAvatar name={name} size="sm" />
                <span className="font-bold text-xs text-[#F2EDE4] truncate max-w-[100px]">{name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SearchableHeroSelect
                  heroes={heroes}
                  selectedHero={conf.hero}
                  onSelectHero={(heroName) => updateConfig(team, name, 'hero', heroName)}
                />
                <select
                  value={conf.medal}
                  onChange={(e) => updateConfig(team, name, 'medal', e.target.value as Medal)}
                  className={`rounded-lg border px-2 py-1 text-xs font-bold cursor-pointer ${
                    conf.medal === 'MVP'
                      ? 'border-[#E8B33D] bg-[#2A2218] text-[#E8B33D]'
                      : conf.medal === 'Gold'
                      ? 'border-[#D8A93A] bg-[#251E17] text-[#D8A93A]'
                      : conf.medal === 'Silver'
                      ? 'border-[#B9B2A8] bg-[#211E1B] text-[#B9B2A8]'
                      : 'border-[#6B4226] bg-[#2A1D15] text-[#b8764a]'
                  }`}
                >
                  <option value="MVP">👑 MVP</option>
                  <option value="Gold">🥇 Gold</option>
                  <option value="Silver">🥈 Silver</option>
                  <option value="Coklat">🍫 Coklat</option>
                </select>
                <div className="flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#161311] px-2 py-1">
                  <span className="text-[10px] text-[#9C948A] font-semibold">Skor:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={conf.score}
                    onChange={(e) => updateConfig(team, name, 'score', parseFloat(e.target.value) || 0)}
                    className="w-12 bg-transparent text-center font-bold text-xs text-[#F2EDE4] focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => removePlayer(team, name)}
                  className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Keluarkan dari match ini"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {names.length < MAX_PLAYERS_PER_TEAM && (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            className="flex-1 rounded-lg border border-[#332C25] bg-[#161311] px-2 py-1.5 text-xs text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none cursor-pointer"
          >
            <option value="">+ Pilih pemain untuk ditambahkan...</option>
            {availablePlayers.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => addPlayer(team)}
            disabled={!addName}
            className="flex items-center gap-1 rounded-lg bg-[#241F1B] border border-[#332C25] px-2.5 py-1.5 text-[10px] font-bold text-[#E8B33D] hover:bg-[#2e2722] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus size={12} />
            <span>Tambah</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      id="edit-match-modal-backdrop"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        id="edit-match-modal-card"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#332C25] pb-3">
          <div>
            <h2 className="font-bold text-base text-[#F2EDE4]">
              Edit Match #{getMatchDisplayNumber(match)}
            </h2>
            <p className="text-[11px] text-[#9C948A]">{match.season}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-lg border border-[#332C25] bg-[#161311] p-2.5 text-[10px] text-[#9C948A]">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#E8B33D]" />
          <span>
            Semua perubahan di sini (termasuk pindah season atau ganti pemain) otomatis menghitung ulang
            statistik klasemen di season lama maupun season tujuan.
          </span>
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">Tanggal Match:</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-xs font-medium text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">Tipe Match:</label>
            <div className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-xs font-semibold text-[#E8B33D] flex items-center justify-between">
              <span>Laga Amal</span>
              <span className="text-[10px] text-[#9C948A] font-normal">Klasemen & Riwayat</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">Season:</label>
            <select
              value={selectedSeasonId}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-xs font-medium text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none cursor-pointer"
            >
              {sortedSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            {selectedSeasonId !== originalSeasonId && (
              <p className="mt-1 text-[10px] text-[#E8B33D]">
                Match akan dipindahkan ke season ini — statistik season lama & baru dihitung ulang otomatis.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">Nomor Match:</label>
            <input
              type="number"
              min={1}
              value={matchNumber}
              onChange={(e) => setMatchNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-xs font-bold text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">Tim Pemenang:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWinner('Tim Pohon')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                winner === 'Tim Pohon'
                  ? 'border border-[#4F7942] bg-[#4F7942] text-white shadow-md'
                  : 'border border-[#332C25] bg-[#161311] text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
            >
              ⬅️ Kiri
            </button>
            <button
              type="button"
              onClick={() => setWinner('Tim Lobby')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                winner === 'Tim Lobby'
                  ? 'border border-[#C97A3D] bg-[#C97A3D] text-white shadow-md'
                  : 'border border-[#332C25] bg-[#161311] text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
            >
              ➡️ Kanan
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {renderTeamSection('pohon', pohonNames, pohonConfig, 'Tim Kiri', '#4F7942', addPohonName, setAddPohonName)}
          {renderTeamSection('lobby', lobbyNames, lobbyConfig, 'Tim Kanan', '#C97A3D', addLobbyName, setAddLobbyName)}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#332C25] pt-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-[#332C25] bg-[#241F1B] px-4 py-2 text-xs font-semibold text-[#F2EDE4] hover:bg-[#2e2722] disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-[#E8B33D] px-4 py-2 text-xs font-bold text-[#161311] hover:bg-[#F3C256] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save size={13} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
