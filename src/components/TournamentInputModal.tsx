import React, { useState, useEffect } from 'react';
import {
  X,
  Swords,
  Trophy,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Calendar,
  Save,
  RotateCcw,
  Sparkles,
  Shield,
  Users,
  Trash2,
  Palette,
  UserPlus,
  Edit2,
} from 'lucide-react';
import { Player, TournamentData, TournamentTeamStanding } from '../types';

interface TournamentInputModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  tournaments: TournamentData[];
  players?: Player[];
  selectedTournamentId?: string;
  onTournamentUpdated: () => void;
  initialMode?: 'fixture' | 'create' | 'standings' | 'team';
  isInline?: boolean;
}

export const TournamentInputModal: React.FC<TournamentInputModalProps> = ({
  isOpen = true,
  onClose,
  tournaments,
  players = [],
  selectedTournamentId,
  onTournamentUpdated,
  initialMode = 'fixture',
  isInline = false,
}) => {
  const [activeTab, setActiveTab] = useState<'fixture' | 'create' | 'standings' | 'team'>(initialMode);
  const [activeTournamentId, setActiveTournamentId] = useState<string>(
    selectedTournamentId || (tournaments[0]?.id || '')
  );

  useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (selectedTournamentId) {
      setActiveTournamentId(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  // Submitting & status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Form State: Input Fixture / Match ---
  const currentTournament =
    tournaments.find((t) => t.id === activeTournamentId) || tournaments[0];

  const teamList = currentTournament?.standings || [];

  const [fixtureRound, setFixtureRound] = useState('Pekan 1 - Matchday 1');
  const [customRound, setCustomRound] = useState('');
  const [fixtureDate, setFixtureDate] = useState(() =>
    new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  );
  const [teamA, setTeamA] = useState(() => teamList[0]?.name || 'Tim Pohon (Arbor Prime)');
  const [teamB, setTeamB] = useState(() => teamList[1]?.name || 'Tim Lobby (Lobby Syndicate)');
  const [scoreA, setScoreA] = useState<number>(2);
  const [scoreB, setScoreB] = useState<number>(0);
  const [fixtureStatus, setFixtureStatus] = useState<'Selesai' | 'Mendatang'>('Selesai');
  const [autoUpdateStandings, setAutoUpdateStandings] = useState(true);

  // --- Form State: Create Tournament ---
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneySeason, setNewTourneySeason] = useState('Musim 2 (2025)');
  const [newTourneyFormat, setNewTourneyFormat] = useState(
    'Klasemen Liga (Double Round-Robin) & Playoff Grand Final BO5'
  );
  const [newTourneyPrize, setNewTourneyPrize] = useState('Gelar Juara Laga Amal & Tropi Bebas Coklat');
  const [customTeams, setCustomTeams] = useState<
    Array<{ name: string; shortName: string; color: string }>
  >([
    { name: 'Tim Pohon Utama', shortName: 'Pohon', color: '#4F7942' },
    { name: 'Tim Lobby Syndicate', shortName: 'Lobby', color: '#C97A3D' },
    { name: 'Tim Cabutan Pantos', shortName: 'Cabutan', color: '#E8B33D' },
    { name: 'Tim Veteran Pantos', shortName: 'Veteran', color: '#8A7A6E' },
  ]);

  // --- Form State: Edit Standings ---
  const [editableStandings, setEditableStandings] = useState<TournamentTeamStanding[]>(() =>
    currentTournament?.standings ? JSON.parse(JSON.stringify(currentTournament.standings)) : []
  );

  // --- Form State: Add / Manage Teams ---
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#E8B33D');
  const [newTeamSlogan, setNewTeamSlogan] = useState('');
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const [customPlayerInput, setCustomPlayerInput] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const TEAM_COLOR_PRESETS = [
    { name: 'Gold Amber', hex: '#E8B33D' },
    { name: 'Forest Green', hex: '#4F7942' },
    { name: 'Lobby Brown', hex: '#C97A3D' },
    { name: 'Crimson Red', hex: '#EF4444' },
    { name: 'Royal Blue', hex: '#3B82F6' },
    { name: 'Purple Void', hex: '#8B5CF6' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Orange Fire', hex: '#F97316' },
    { name: 'Cyan Frost', hex: '#06B6D4' },
    { name: 'Neon Pink', hex: '#EC4899' },
    { name: 'Veteran Grey', hex: '#8A7A6E' },
    { name: 'Dark Indigo', hex: '#6366F1' },
  ];

  // Synchronize when currentTournament changes
  useEffect(() => {
    if (currentTournament) {
      setEditableStandings(JSON.parse(JSON.stringify(currentTournament.standings)));
      if (currentTournament.standings.length >= 2) {
        setTeamA(currentTournament.standings[0].name);
        setTeamB(currentTournament.standings[1].name);
      }
    }
  }, [activeTournamentId, tournaments]);

  if (!isInline && !isOpen) return null;

  // Handle Save Fixture
  const handleSubmitFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTournament) return;
    if (teamA === teamB) {
      setErrorMsg('Tim A dan Tim B tidak boleh sama!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const finalRound = fixtureRound === 'Lainnya' ? customRound : fixtureRound;
      const winnerName =
        fixtureStatus === 'Selesai'
          ? scoreA > scoreB
            ? teamA
            : scoreB > scoreA
            ? teamB
            : undefined
          : undefined;

      const res = await fetch(`/api/tournaments/${currentTournament.id}/fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: finalRound || 'Pekan Reguler',
          date: fixtureDate,
          teamA,
          teamB,
          scoreA,
          scoreB,
          status: fixtureStatus,
          winner: winnerName,
          autoUpdateStandings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan pertandingan turnamen');
      }

      setSuccessMsg('Pertandingan turnamen berhasil disimpan dan klasemen diperbarui!');
      onTournamentUpdated();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Tournament
  const handleSubmitCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyName.trim()) {
      setErrorMsg('Nama turnamen wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formattedTeams: TournamentTeamStanding[] = customTeams.map((ct, idx) => ({
        id: 'team-' + idx + '-' + Date.now(),
        name: ct.name,
        shortName: ct.shortName,
        color: ct.color,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        gameWins: 0,
        gameLosses: 0,
        mvpCount: 0,
        goldCount: 0,
        silverCount: 0,
        coklatCount: 0,
        streak: '-',
        form: [],
      }));

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTourneyName,
          season: newTourneySeason,
          format: newTourneyFormat,
          prizePool: newTourneyPrize,
          teams: formattedTeams,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat turnamen');
      }

      const created = await res.json();
      setSuccessMsg(`Turnamen "${created.name}" berhasil dibuat!`);
      setActiveTournamentId(created.id);
      onTournamentUpdated();
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('fixture');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat turnamen baru');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Standings Directly
  const handleSubmitStandings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTournament) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/tournaments/${currentTournament.id}/standings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standings: editableStandings }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memperbarui klasemen');
      }

      setSuccessMsg('Klasemen tim turnamen berhasil diperbarui!');
      onTournamentUpdated();
      setTimeout(() => {
        setSuccessMsg(null);
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui klasemen');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Team Form
  const handleResetTeamForm = () => {
    setNewTeamName('');
    setNewTeamShortName('');
    setNewTeamColor('#E8B33D');
    setNewTeamSlogan('');
    setSelectedRoster([]);
    setCustomPlayerInput('');
    setEditingTeamId(null);
  };

  // Handle Pre-fill for Edit Team
  const handleEditTeam = (team: TournamentTeamStanding) => {
    setEditingTeamId(team.id);
    setNewTeamName(team.name);
    setNewTeamShortName(team.shortName);
    setNewTeamColor(team.color || '#E8B33D');
    setNewTeamSlogan(team.slogan || '');
    setSelectedRoster(team.members ? [...team.members] : []);
    setCustomPlayerInput('');
    setActiveTab('team');
  };

  // Toggle Roster Player
  const toggleRosterPlayer = (playerName: string) => {
    setSelectedRoster((prev) =>
      prev.includes(playerName) ? prev.filter((p) => p !== playerName) : [...prev, playerName]
    );
  };

  // Add Custom Player to Roster
  const handleAddCustomPlayer = () => {
    const trimmed = customPlayerInput.trim();
    if (!trimmed) return;
    if (!selectedRoster.includes(trimmed)) {
      setSelectedRoster((prev) => [...prev, trimmed]);
    }
    setCustomPlayerInput('');
  };

  // Handle Save / Add Team
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTournament) return;
    if (!newTeamName.trim()) {
      setErrorMsg('Nama tim wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const generatedShort = (newTeamShortName.trim() || newTeamName.trim().slice(0, 3)).toUpperCase();

    try {
      if (editingTeamId) {
        // Update existing team
        const res = await fetch(`/api/tournaments/${activeTournamentId}/teams/${editingTeamId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newTeamName.trim(),
            shortName: generatedShort,
            color: newTeamColor,
            slogan: newTeamSlogan.trim(),
            members: selectedRoster,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui data tim');

        setSuccessMsg(`Data tim "${newTeamName}" berhasil diperbarui!`);
        handleResetTeamForm();
        onTournamentUpdated();
      } else {
        // Create new team
        const res = await fetch(`/api/tournaments/${activeTournamentId}/teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newTeamName.trim(),
            shortName: generatedShort,
            color: newTeamColor,
            slogan: newTeamSlogan.trim(),
            members: selectedRoster,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan tim baru');

        setSuccessMsg(`Tim "${newTeamName}" (${generatedShort}) berhasil didaftarkan ke ${currentTournament.name}!`);
        handleResetTeamForm();
        onTournamentUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (currentTournament && currentTournament.standings.length <= 2) {
      setErrorMsg('Turnamen membutuhkan minimal 2 tim peserta.');
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus tim "${teamName}" dari turnamen ini?`)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/tournaments/${activeTournamentId}/teams/${teamId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus tim');

      setSuccessMsg(`Tim "${teamName}" berhasil dihapus dari turnamen.`);
      if (editingTeamId === teamId) {
        handleResetTeamForm();
      }
      onTournamentUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus tim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className={`relative w-full ${isInline ? 'rounded-2xl border border-[#332C25] bg-[#161311] shadow-xl' : 'max-w-2xl rounded-2xl border border-[#332C25] bg-[#161311] shadow-2xl my-8'}`}>
      {/* Modal Header */}
      <div className="flex items-center justify-between border-b border-[#332C25] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8B33D]/30 bg-[#241F1B] text-[#E8B33D]">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="font-black text-base text-[#F2EDE4] sm:text-lg">
              Input & Manajemen Turnamen
            </h3>
            <p className="text-xs text-[#9C948A]">
              Catat skor laga, buat edisi turnamen baru, atau sesuaikan klasemen poin
            </p>
          </div>
        </div>
        {!isInline && onClose && (
          <button
            id="btn-close-tournament-modal"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4] transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

        {/* Tournament Selector Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#332C25] bg-[#1D1916] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#9C948A] uppercase tracking-wider">
              Turnamen Aktif:
            </span>
            <select
              id="modal-select-tournament"
              value={activeTournamentId}
              onChange={(e) => setActiveTournamentId(e.target.value)}
              className="rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1 font-semibold text-xs text-[#F2EDE4] focus:outline-hidden"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-[#E8B33D] font-medium">
            Format: {currentTournament?.format.split('&')[0]}
          </div>
        </div>

        {/* Tab Navigation inside Modal */}
        <div className="flex border-b border-[#332C25] px-5 bg-[#181412]">
          <button
            id="tab-input-fixture"
            type="button"
            onClick={() => setActiveTab('fixture')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold text-xs transition-colors ${
              activeTab === 'fixture'
                ? 'border-[#E8B33D] text-[#E8B33D]'
                : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <Swords size={14} />
            <span>Input Skor & Laga</span>
          </button>

          <button
            id="tab-input-create-tournament"
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold text-xs transition-colors ${
              activeTab === 'create'
                ? 'border-[#E8B33D] text-[#E8B33D]'
                : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <PlusCircle size={14} />
            <span>Buat Turnamen Baru</span>
          </button>

          <button
            id="tab-input-standings"
            type="button"
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold text-xs transition-colors ${
              activeTab === 'standings'
                ? 'border-[#E8B33D] text-[#E8B33D]'
                : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <Sliders size={14} />
            <span>Koreksi Klasemen</span>
          </button>

          <button
            id="tab-input-team"
            type="button"
            onClick={() => {
              setActiveTab('team');
              handleResetTeamForm();
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-bold text-xs transition-colors ${
              activeTab === 'team'
                ? 'border-[#E8B33D] text-[#E8B33D]'
                : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <Shield size={14} />
            <span>+ Tim Baru</span>
          </button>
        </div>

        {/* Notification alerts */}
        {errorMsg && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-[#4F7942]/60 bg-[#4F7942]/20 p-3 text-xs text-emerald-300">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: INPUT SKOR & HASIL LAGA */}
        {activeTab === 'fixture' && (
          <form onSubmit={handleSubmitFixture} className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Round / Babak */}
              <div>
                <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
                  Babak / Round Pertandingan
                </label>
                <select
                  id="fixture-select-round"
                  value={fixtureRound}
                  onChange={(e) => setFixtureRound(e.target.value)}
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4] focus:outline-hidden"
                >
                  <option value="Pekan 1 - Matchday 1">Pekan 1 - Matchday 1</option>
                  <option value="Pekan 1 - Matchday 2">Pekan 1 - Matchday 2</option>
                  <option value="Pekan 2 - Matchday 1">Pekan 2 - Matchday 1</option>
                  <option value="Pekan 2 - Matchday 2">Pekan 2 - Matchday 2</option>
                  <option value="Pekan 3 - Matchday 1">Pekan 3 - Matchday 1</option>
                  <option value="Pekan 3 - Matchday 2">Pekan 3 - Matchday 2</option>
                  <option value="Pekan 4 - Matchday Penentuan">Pekan 4 - Matchday Penentuan</option>
                  <option value="Playoffs - Semifinal 1 (BO3)">Playoffs - Semifinal 1 (BO3)</option>
                  <option value="Playoffs - Semifinal 2 (BO3)">Playoffs - Semifinal 2 (BO3)</option>
                  <option value="Grand Final Piala Pantos (BO5)">Grand Final Piala Pantos (BO5)</option>
                  <option value="Lainnya">Ketik Babak Lainnya...</option>
                </select>

                {fixtureRound === 'Lainnya' && (
                  <input
                    type="text"
                    placeholder="Contoh: Bronze Match (BO3)"
                    value={customRound}
                    onChange={(e) => setCustomRound(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs text-[#F2EDE4]"
                  />
                )}
              </div>

              {/* Match Date */}
              <div>
                <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
                  Tanggal & Waktu
                </label>
                <input
                  id="fixture-input-date"
                  type="text"
                  value={fixtureDate}
                  onChange={(e) => setFixtureDate(e.target.value)}
                  placeholder="Contoh: 14 Feb 2025 · 20:00 WIB"
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Teams & Scores Box */}
            <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-4">
              <span className="mb-3 block font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                Pertemuan Tim & Skor Pertandingan
              </span>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 items-center">
                {/* Team A */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-[11px] font-bold text-[#9C948A] uppercase">
                    Tim A (Kandang)
                  </label>
                  <select
                    id="fixture-team-a"
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs font-semibold text-[#F2EDE4]"
                  >
                    {teamList.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-[#9C948A]">Skor Game:</label>
                    <input
                      id="fixture-score-a"
                      type="number"
                      min={0}
                      max={5}
                      value={scoreA}
                      onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                      className="w-16 rounded-lg border border-[#332C25] bg-[#241F1B] px-2 py-1 text-center font-black text-sm text-[#F2EDE4]"
                    />
                  </div>
                </div>

                {/* VS Divider */}
                <div className="sm:col-span-1 text-center py-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#241F1B] border border-[#332C25] font-black text-xs text-[#E8B33D]">
                    VS
                  </span>
                </div>

                {/* Team B */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-[11px] font-bold text-[#9C948A] uppercase">
                    Tim B (Tandang)
                  </label>
                  <select
                    id="fixture-team-b"
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs font-semibold text-[#F2EDE4]"
                  >
                    {teamList.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-[#9C948A]">Skor Game:</label>
                    <input
                      id="fixture-score-b"
                      type="number"
                      min={0}
                      max={5}
                      value={scoreB}
                      onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                      className="w-16 rounded-lg border border-[#332C25] bg-[#241F1B] px-2 py-1 text-center font-black text-sm text-[#F2EDE4]"
                    />
                  </div>
                </div>
              </div>

              {/* Match Status & Prediction */}
              <div className="mt-4 pt-3 border-t border-[#332C25]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Selesai"
                      checked={fixtureStatus === 'Selesai'}
                      onChange={() => setFixtureStatus('Selesai')}
                      className="accent-[#E8B33D]"
                    />
                    <span className="text-[#F2EDE4] font-medium">Laga Selesai</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Mendatang"
                      checked={fixtureStatus === 'Mendatang'}
                      onChange={() => setFixtureStatus('Mendatang')}
                      className="accent-[#E8B33D]"
                    />
                    <span className="text-[#9C948A] font-medium">Jadwal Mendatang</span>
                  </label>
                </div>

                {fixtureStatus === 'Selesai' && (
                  <div className="text-[11px] font-semibold text-[#E8B33D]">
                    Pemenang Terdeteksi:{' '}
                    <span className="underline">
                      {scoreA > scoreB ? teamA : scoreB > scoreA ? teamB : 'Seri'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox auto update */}
            <label className="flex items-center gap-2 text-xs text-[#D8D0C5] cursor-pointer bg-[#241F1B]/60 p-3 rounded-xl border border-[#332C25]">
              <input
                id="checkbox-auto-standings"
                type="checkbox"
                checked={autoUpdateStandings}
                onChange={(e) => setAutoUpdateStandings(e.target.checked)}
                className="h-4 w-4 rounded accent-[#4F7942]"
              />
              <span>
                <strong>Otomatis perbarui klasemen:</strong> Tim pemenang dapat +3 Poin, game wins/losses dicatat, dan form W/L diperbarui.
              </span>
            </label>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#332C25] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B]"
              >
                Batal
              </button>
              <button
                id="btn-save-fixture"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-5 py-2 text-xs font-bold text-[#161311] hover:bg-[#e0a82b] disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Laga Turnamen'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: BUAT TURNAMEN BARU */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmitCreateTournament} className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
                  Nama Turnamen *
                </label>
                <input
                  id="create-tourney-name"
                  type="text"
                  required
                  placeholder="Contoh: Piala Amal Pantos - Musim 2"
                  value={newTourneyName}
                  onChange={(e) => setNewTourneyName(e.target.value)}
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4]"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
                  Musim / Edisi
                </label>
                <input
                  id="create-tourney-season"
                  type="text"
                  placeholder="Contoh: Musim 2 (2025)"
                  value={newTourneySeason}
                  onChange={(e) => setNewTourneySeason(e.target.value)}
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4]"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
                  Format Turnamen
                </label>
                <input
                  id="create-tourney-format"
                  type="text"
                  value={newTourneyFormat}
                  onChange={(e) => setNewTourneyFormat(e.target.value)}
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4]"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
                  Hadiah & Trofi
                </label>
                <input
                  id="create-tourney-prize"
                  type="text"
                  value={newTourneyPrize}
                  onChange={(e) => setNewTourneyPrize(e.target.value)}
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4]"
                />
              </div>
            </div>

            {/* Teams in Tournament */}
            <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                  Daftar Tim Peserta ({customTeams.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomTeams((prev) => [
                      ...prev,
                      {
                        name: `Tim Baru #${prev.length + 1}`,
                        shortName: `T${prev.length + 1}`,
                        color: '#4F7942',
                      },
                    ])
                  }
                  className="text-[11px] font-bold text-[#E8B33D] hover:underline"
                >
                  + Tambah Tim
                </button>
              </div>

              <div className="space-y-2">
                {customTeams.map((ct, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={ct.color}
                      onChange={(e) =>
                        setCustomTeams((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, color: e.target.value } : t))
                        )
                      }
                      className="h-8 w-8 cursor-pointer rounded border border-[#332C25] bg-transparent p-0"
                    />
                    <input
                      type="text"
                      placeholder="Nama Lengkap Tim"
                      value={ct.name}
                      onChange={(e) =>
                        setCustomTeams((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, name: e.target.value } : t))
                        )
                      }
                      className="flex-1 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs text-[#F2EDE4]"
                    />
                    <input
                      type="text"
                      placeholder="Singkatan"
                      value={ct.shortName}
                      onChange={(e) =>
                        setCustomTeams((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, shortName: e.target.value } : t))
                        )
                      }
                      className="w-24 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs text-[#F2EDE4]"
                    />
                    {customTeams.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCustomTeams((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#332C25] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B]"
              >
                Batal
              </button>
              <button
                id="btn-create-tourney-submit"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-5 py-2 text-xs font-bold text-[#161311] hover:bg-[#e0a82b] disabled:opacity-50"
              >
                <PlusCircle size={14} />
                <span>{isSubmitting ? 'Membuat...' : 'Buat Turnamen'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: KOREKSI KLASEMEN TIM MANUAL */}
        {activeTab === 'standings' && (
          <form onSubmit={handleSubmitStandings} className="p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-[#9C948A]">
              <span>Sesuaikan angka poin, rekor menang/kalah, dan jumlah medali secara langsung:</span>
              <span className="font-semibold text-[#E8B33D]">{currentTournament?.name}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#332C25] bg-[#1D1916]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#332C25] bg-[#241F1B] text-[10px] font-bold text-[#9C948A] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Tim</th>
                    <th className="py-2.5 px-2 text-center w-14">MP</th>
                    <th className="py-2.5 px-2 text-center w-14 text-emerald-400">W</th>
                    <th className="py-2.5 px-2 text-center w-14 text-red-400">L</th>
                    <th className="py-2.5 px-2 text-center w-16">Game W</th>
                    <th className="py-2.5 px-2 text-center w-16">Game L</th>
                    <th className="py-2.5 px-2 text-center w-16 text-[#E8B33D]">Poin</th>
                    <th className="py-2.5 px-2 text-center w-16">MVP</th>
                    <th className="py-2.5 px-2 text-center w-16 text-[#b8764a]">Coklat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#332C25]/60">
                  {editableStandings.map((team, idx) => (
                    <tr key={team.id || idx} className="hover:bg-[#241F1B]/40">
                      <td className="py-2 px-3 font-semibold text-[#F2EDE4]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="truncate max-w-[120px]">{team.name}</span>
                        </div>
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.played}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, played: val } : t))
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-[#F2EDE4] border border-[#332C25]"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.won}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) =>
                                i === idx ? { ...t, won: val, points: val * 3 } : t
                              )
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-emerald-400 font-bold border border-[#332C25]"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.lost}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, lost: val } : t))
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-red-400 font-bold border border-[#332C25]"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.gameWins}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, gameWins: val } : t))
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-[#F2EDE4] border border-[#332C25]"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.gameLosses}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, gameLosses: val } : t))
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-[#9C948A] border border-[#332C25]"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.points}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, points: val } : t))
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-[#E8B33D] font-black border border-[#332C25]"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.mvpCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, mvpCount: val } : t))
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-[#E8B33D] border border-[#332C25]"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          value={team.coklatCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditableStandings((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, coklatCount: val } : t))
                            );
                          }}
                          className="w-12 rounded bg-[#241F1B] px-1 py-1 text-center text-xs text-[#b8764a] border border-[#332C25]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#332C25] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B]"
              >
                Batal
              </button>
              <button
                id="btn-save-standings-submit"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-5 py-2 text-xs font-bold text-[#161311] hover:bg-[#e0a82b] disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Klasemen'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: TAMBAH TIM BARU & MANAJEMEN TIM */}
        {activeTab === 'team' && (
          <div className="p-5 space-y-6">
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#F2EDE4]">
                    {editingTeamId ? 'Edit Data Tim Peserta' : 'Daftarkan Tim Baru ke Turnamen'}
                  </h4>
                  <p className="text-xs text-[#9C948A]">
                    Turnamen target: <span className="font-semibold text-[#E8B33D]">{currentTournament?.name}</span> ({teamList.length} tim terdaftar)
                  </p>
                </div>
                {editingTeamId && (
                  <button
                    type="button"
                    onClick={handleResetTeamForm}
                    className="flex items-center gap-1 text-xs text-[#E8B33D] hover:underline"
                  >
                    <RotateCcw size={12} />
                    <span>Batal Edit / Buat Baru</span>
                  </button>
                )}
              </div>

              {/* Live Preview Card */}
              <div
                className="flex items-center justify-between rounded-xl border border-[#332C25] bg-[#241F1B] p-3.5"
                style={{ borderLeft: `4px solid ${newTeamColor}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs text-[#161311] shadow-sm"
                    style={{ backgroundColor: newTeamColor }}
                  >
                    {(newTeamShortName || newTeamName.slice(0, 3) || 'TIM').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#F2EDE4]">
                        {newTeamName || 'Nama Tim Baru'}
                      </span>
                      <span className="rounded bg-[#161311] px-1.5 py-0.5 font-mono text-[10px] text-[#9C948A] border border-[#332C25]">
                        {(newTeamShortName || newTeamName.slice(0, 3) || 'TAG').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[#9C948A]">
                      {newTeamSlogan || 'Siap bertanding di arena turnamen Laga Amal'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded bg-[#161311] px-2 py-1 text-[11px] font-semibold text-[#E8B33D] border border-[#332C25]">
                    {selectedRoster.length} Pemain Roster
                  </span>
                </div>
              </div>

              {/* Name & Short Name */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#F2EDE4]">
                    Nama Lengkap Tim *
                  </label>
                  <input
                    id="input-new-team-name"
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTeamName(val);
                      if (!editingTeamId && (!newTeamShortName || newTeamShortName.length <= 4)) {
                        const words = val.trim().split(/\s+/);
                        if (words.length >= 2) {
                          setNewTeamShortName(words.map((w) => w[0]).join('').slice(0, 4).toUpperCase());
                        } else if (words[0]?.length >= 3) {
                          setNewTeamShortName(words[0].slice(0, 3).toUpperCase());
                        }
                      }
                    }}
                    placeholder="Contoh: Tim Cyber Dragon, Tim Kuda Hitam"
                    className="w-full rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-xs text-[#F2EDE4] placeholder-[#9C948A]/60 focus:border-[#E8B33D] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#F2EDE4]">
                    Singkatan / Tag *
                  </label>
                  <input
                    id="input-new-team-short"
                    type="text"
                    maxLength={6}
                    required
                    value={newTeamShortName}
                    onChange={(e) => setNewTeamShortName(e.target.value.toUpperCase())}
                    placeholder="Contoh: KDH, CBD"
                    className="w-full rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 font-mono text-xs font-bold text-[#E8B33D] placeholder-[#9C948A]/60 focus:border-[#E8B33D] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Slogan */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#F2EDE4]">
                  Motto / Slogan Tim (Opsional)
                </label>
                <input
                  id="input-new-team-slogan"
                  type="text"
                  value={newTeamSlogan}
                  onChange={(e) => setNewTeamSlogan(e.target.value)}
                  placeholder="Contoh: Pantang Coklat Sebelum Mengangkat Tropi!"
                  className="w-full rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-xs text-[#F2EDE4] placeholder-[#9C948A]/60 focus:border-[#E8B33D] focus:outline-hidden"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#F2EDE4]">
                  <span className="flex items-center gap-1.5">
                    <Palette size={13} className="text-[#E8B33D]" />
                    <span>Pilih Aksen Warna Tim</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#9C948A]">{newTeamColor}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {TEAM_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setNewTeamColor(preset.hex)}
                      title={preset.name}
                      className={`flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium transition-transform ${
                        newTeamColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'border-[#F2EDE4] ring-2 ring-[#E8B33D] scale-105 bg-[#241F1B]'
                          : 'border-[#332C25] bg-[#241F1B]/60 text-[#9C948A] hover:border-[#9C948A]'
                      }`}
                    >
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span className="hidden sm:inline text-[#F2EDE4]">{preset.name}</span>
                    </button>
                  ))}
                  {/* Custom color input */}
                  <div className="flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#241F1B] px-2 py-1">
                    <input
                      type="color"
                      value={newTeamColor}
                      onChange={(e) => setNewTeamColor(e.target.value)}
                      className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span className="text-[10px] text-[#9C948A]">Custom</span>
                  </div>
                </div>
              </div>

              {/* Roster / Pemain */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#F2EDE4]">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="text-[#E8B33D]" />
                    <span>Roster / Anggota Pemain Tim ({selectedRoster.length} Terpilih)</span>
                  </span>
                  <span className="text-[11px] text-[#9C948A]">Klik nama pemain untuk tambah/hapus</span>
                </label>

                {/* Existing Player Chips */}
                {players.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-xl border border-[#332C25]/60 bg-[#1A1614] p-2">
                    {players.map((p) => {
                      const isSelected = selectedRoster.includes(p.name);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleRosterPlayer(p.name)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#E8B33D] font-bold text-[#161311] shadow-xs'
                              : 'border border-[#332C25] bg-[#241F1B] font-medium text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2e2722]'
                          }`}
                        >
                          <span>{p.name}</span>
                          <span className={`text-[10px] opacity-75 ${isSelected ? 'text-[#161311]' : 'text-[#E8B33D]'}`}>
                            ({p.tier})
                          </span>
                          {isSelected && <CheckCircle2 size={11} className="ml-0.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Custom Player Input */}
                <div className="flex gap-2">
                  <input
                    id="input-custom-player-roster"
                    type="text"
                    value={customPlayerInput}
                    onChange={(e) => setCustomPlayerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomPlayer();
                      }
                    }}
                    placeholder="Tambah nama pemain luar / cabutan lain..."
                    className="flex-1 rounded-xl border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs text-[#F2EDE4] placeholder-[#9C948A]/60 focus:border-[#E8B33D] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPlayer}
                    className="flex items-center gap-1 rounded-xl border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs font-semibold text-[#E8B33D] hover:bg-[#2d2621]"
                  >
                    <UserPlus size={13} />
                    <span>+ Tambah</span>
                  </button>
                </div>

                {/* Selected roster preview pills */}
                {selectedRoster.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedRoster.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8B33D]"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => toggleRosterPlayer(name)}
                          className="hover:text-red-400 ml-0.5"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {editingTeamId && (
                  <button
                    type="button"
                    onClick={handleResetTeamForm}
                    className="rounded-xl border border-[#332C25] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B]"
                  >
                    Batal Edit
                  </button>
                )}
                <button
                  id="btn-submit-team"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-5 py-2 text-xs font-bold text-[#161311] hover:bg-[#e0a82b] disabled:opacity-50"
                >
                  {editingTeamId ? <Save size={14} /> : <Shield size={14} />}
                  <span>
                    {isSubmitting
                      ? 'Menyimpan...'
                      : editingTeamId
                      ? 'Simpan Perubahan Tim'
                      : '+ Daftarkan Tim ke Turnamen'}
                  </span>
                </button>
              </div>
            </form>

            {/* Current Registered Teams List */}
            <div className="border-t border-[#332C25] pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#9C948A]">
                  Daftar Tim Terdaftar ({teamList.length} Tim)
                </h4>
                <span className="text-[11px] text-[#9C948A]">
                  Turnamen: {currentTournament?.name}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {teamList.map((t, idx) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-[#332C25] bg-[#1A1614] p-3 transition-colors hover:border-[#423930]"
                    style={{ borderLeft: `3px solid ${t.color}` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#241F1B] text-[10px] font-bold text-[#9C948A]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-bold text-xs text-[#F2EDE4]">{t.name}</span>
                          <span className="rounded bg-[#241F1B] px-1 py-0.5 font-mono text-[9px] text-[#E8B33D] border border-[#332C25]">
                            {t.shortName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#9C948A]">
                          <span>{t.played} Laga · {t.points} Poin</span>
                          {t.members && t.members.length > 0 && (
                            <span>· {t.members.length} Pemain</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleEditTeam(t)}
                        title="Edit Tim"
                        className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#E8B33D] transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(t.id, t.name)}
                        title="Hapus Tim"
                        disabled={teamList.length <= 2}
                        className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#241F1B] hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );

  if (isInline) {
    return <div id="tournament-input-inline-wrapper">{modalContent}</div>;
  }

  return (
    <div
      id="tournament-input-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto"
    >
      {modalContent}
    </div>
  );
};
