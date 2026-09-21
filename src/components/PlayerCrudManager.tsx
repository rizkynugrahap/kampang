import React, { useState, useMemo } from 'react';
import { Player, MLBB_TIER_OPTIONS, LagaAmalSeasonData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { getPlayerDocId } from '../utils/playerId';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  X,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ShieldAlert,
  Flame,
  Crown,
} from 'lucide-react';

export type PlayerSortField = 'name' | 'total_match' | 'winRate' | 'mvp' | 'coklat' | 'score' | 'status';
export type PlayerSortDirection = 'asc' | 'desc';

interface PlayerCrudManagerProps {
  players: Player[];
  activeSeason?: LagaAmalSeasonData;
  isAdmin: boolean;
  onAddPlayer: (player: {
    name: string;
    status: 'Aktif' | 'Cabutan';
    tier: string;
    avatar_url?: string;
    julukan?: string;
  }) => Promise<boolean>;
  onUpdatePlayer: (playerId: number | string, updates: Partial<Player>) => Promise<boolean>;
  onDeletePlayer: (playerId: number | string, playerName?: string) => Promise<boolean>;
  onGenerateJulukan?: (playerId: number | string) => Promise<string | null>;
  onOpenLogin: () => void;
  onSelectPlayer?: (playerId: number | string) => void;
}

export const PlayerCrudManager: React.FC<PlayerCrudManagerProps> = ({
  players,
  activeSeason,
  isAdmin,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onGenerateJulukan,
  onOpenLogin,
  onSelectPlayer,
}) => {
  // Search, Filter, and Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Aktif' | 'Cabutan'>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<PlayerSortField>('total_match');
  const [sortDirection, setSortDirection] = useState<PlayerSortDirection>('desc');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);

  // Form States for Add
  const [addName, setAddName] = useState('');
  const [addStatus, setAddStatus] = useState<'Aktif' | 'Cabutan'>('Aktif');
  const [addTier, setAddTier] = useState<string>('Legend');
  const [addAvatarUrl, setAddAvatarUrl] = useState('');
  const [addJulukan, setAddJulukan] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Form States for Edit
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'Aktif' | 'Cabutan'>('Aktif');
  const [editTier, setEditTier] = useState<string>('Legend');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editJulukan, setEditJulukan] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Loading/Feedback States
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [updatingPlayerId, setUpdatingPlayerId] = useState<number | string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Stats calculation
  const totalCount = players.length;
  const aktifCount = players.filter((p) => p.status === 'Aktif').length;
  const cabutanCount = players.filter((p) => p.status === 'Cabutan').length;
  const mythicCount = players.filter((p) => (p.tier || '').toLowerCase().includes('myth')).length;

  // Toggle sorting helper
  const handleSortToggle = (field: PlayerSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Filtered & Sorted players list
  const filteredPlayers = useMemo(() => {
    const list = players.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.julukan || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

      const matchTier =
        tierFilter === 'ALL' || (p.tier || '').toLowerCase() === tierFilter.toLowerCase();

      return matchSearch && matchStatus && matchTier;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'total_match':
          comparison = (a.total_match ?? 0) - (b.total_match ?? 0);
          break;
        case 'winRate':
          comparison = (a.winRate ?? 0) - (b.winRate ?? 0);
          break;
        case 'mvp':
          comparison = (a.medals?.MVP ?? 0) - (b.medals?.MVP ?? 0);
          break;
        case 'coklat':
          comparison = (a.medals?.Coklat ?? 0) - (b.medals?.Coklat ?? 0);
          break;
        case 'score':
          comparison = (a.score ?? 0) - (b.score ?? 0);
          break;
        case 'status':
          comparison = a.status === b.status ? 0 : a.status === 'Aktif' ? 1 : -1;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [players, searchTerm, statusFilter, tierFilter, sortField, sortDirection]);

  // Handle Quick Toggle Status
  const handleToggleStatus = async (player: Player) => {
    if (!isAdmin) {
      onOpenLogin();
      return;
    }
    const newStatus = player.status === 'Cabutan' ? 'Aktif' : 'Cabutan';
    setUpdatingPlayerId(player.id);
    try {
      const ok = await onUpdatePlayer(player.id, { status: newStatus });
      if (ok) {
        showToast(`Status ${player.name} diubah menjadi: ${newStatus}`);
      } else {
        showToast(`Gagal mengubah status ${player.name}`, 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat update status', 'error');
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  // Handle Quick Change Tier
  const handleQuickTierChange = async (player: Player, newTier: string) => {
    if (!isAdmin) {
      onOpenLogin();
      return;
    }
    setUpdatingPlayerId(player.id);
    try {
      const ok = await onUpdatePlayer(player.id, { tier: newTier });
      if (ok) {
        showToast(`Tier ${player.name} diubah ke ${newTier}`);
      } else {
        showToast('Gagal update tier', 'error');
      }
    } catch {
      showToast('Gagal update tier', 'error');
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  // Handle Generate Julukan
  const handleGenerateJulukanClick = async (player: Player) => {
    if (!isAdmin) {
      onOpenLogin();
      return;
    }
    setGeneratingId(player.id);
    try {
      if (onGenerateJulukan) {
        const newTitle = await onGenerateJulukan(player.id);
        if (newTitle) {
          showToast(`Julukan baru untuk ${player.name}: "${newTitle}"`);
        } else {
          showToast(`Julukan ${player.name} berhasil diperbarui`);
        }
      }
    } catch (e: any) {
      showToast(e?.message || 'Gagal generate julukan', 'error');
    } finally {
      setGeneratingId(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (p: Player) => {
    setEditingPlayer(p);
    setEditName(p.name);
    setEditStatus(p.status || 'Aktif');
    setEditTier(p.tier || 'Legend');
    setEditAvatarUrl(p.avatar_url || '');
    setEditJulukan(p.julukan || '');
  };

  // Submit Add Player Form
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = addName.trim();
    if (!cleanName) {
      showToast('Nama pemain wajib diisi', 'error');
      return;
    }

    // Duplicate check — exact name first
    const isDuplicate = players.some(
      (p) => p.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`Pemain dengan nama "${cleanName}" sudah terdaftar di database!`, 'error');
      return;
    }

    // Also block names that LOOK different but would collide in storage —
    // the database key is a slug of the name (spaces/punctuation stripped),
    // so e.g. "Mr. GiL" and "Mr GiL" normalize to the same key and one
    // would silently overwrite the other's data. Catch that here instead.
    const newSlug = getPlayerDocId({ name: cleanName, id: 0 } as Player);
    const slugConflict = players.find(
      (p) => getPlayerDocId(p) === newSlug && p.name.trim().toLowerCase() !== cleanName.toLowerCase()
    );
    if (slugConflict) {
      showToast(
        `Nama "${cleanName}" terlalu mirip dengan "${slugConflict.name}" yang sudah ada (beda spasi/simbol saja) — datanya bisa saling menimpa. Pakai nama yang lebih berbeda.`,
        'error'
      );
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const success = await onAddPlayer({
        name: cleanName,
        status: addStatus,
        tier: addTier,
        avatar_url: addAvatarUrl.trim() || undefined,
        julukan: addJulukan.trim() || undefined,
      });

      if (success) {
        showToast(`Pemain "${cleanName}" berhasil ditambahkan ke database!`);
        setShowAddModal(false);
        setAddName('');
        setAddAvatarUrl('');
        setAddJulukan('');
        setAddStatus('Aktif');
        setAddTier('Legend');
      } else {
        showToast('Gagal menambahkan pemain', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan saat menambah pemain', 'error');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Submit Edit Player Form
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      showToast('Nama pemain wajib diisi', 'error');
      return;
    }

    // Duplicate name collision check (different player ID)
    const isConflict = players.some(
      (p) =>
        String(p.id) !== String(editingPlayer.id) &&
        p.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isConflict) {
      showToast(`Nama "${cleanName}" sudah digunakan pemain lain!`, 'error');
      return;
    }

    // Same storage-key collision guard as the Add form — renaming a player
    // to something that slugs the same as another existing player would
    // silently merge/overwrite their data in Supabase.
    const editedSlug = getPlayerDocId({ name: cleanName, id: 0 } as Player);
    const editedSlugConflict = players.find(
      (p) =>
        String(p.id) !== String(editingPlayer.id) &&
        getPlayerDocId(p) === editedSlug &&
        p.name.trim().toLowerCase() !== cleanName.toLowerCase()
    );
    if (editedSlugConflict) {
      showToast(
        `Nama "${cleanName}" terlalu mirip dengan "${editedSlugConflict.name}" yang sudah ada (beda spasi/simbol saja) — datanya bisa saling menimpa. Pakai nama yang lebih berbeda.`,
        'error'
      );
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const success = await onUpdatePlayer(editingPlayer.id, {
        name: cleanName,
        status: editStatus,
        tier: editTier,
        avatar_url: editAvatarUrl.trim() || undefined,
        julukan: editJulukan.trim() || undefined,
        julukan_updated_at: new Date().toISOString(),
      });

      if (success) {
        showToast(`Data pemain "${cleanName}" berhasil diperbarui!`);
        setEditingPlayer(null);
      } else {
        showToast('Gagal memperbarui data pemain', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan saat update pemain', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Delete Player
  const handleSubmitDelete = async () => {
    if (!deletingPlayer) return;
    setIsSubmittingDelete(true);
    try {
      const success = await onDeletePlayer(deletingPlayer.id, deletingPlayer.name);
      if (success) {
        showToast(`Pemain "${deletingPlayer.name}" berhasil dihapus dari database.`);
        setDeletingPlayer(null);
      } else {
        showToast('Gagal menghapus pemain', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus pemain', 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold shadow-2xl backdrop-blur-md border animate-scaleUp ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/60 shadow-emerald-950/50'
              : 'bg-rose-950/95 text-rose-200 border-rose-500/60 shadow-rose-950/50'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Header & Stats Bar */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-[#E8B33D]/20 p-2 text-[#E8B33D] border border-[#E8B33D]/30">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#F2EDE4] tracking-tight flex items-center gap-2">
                  Database Pemain Laga Amal (CRUD)
                  {isAdmin ? (
                    <span className="rounded-full bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Mode Admin Aktif
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-950 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      Read Only
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#9C948A] mt-0.5">
                  Kelola identitas, tier rank MLBB, status badge (Aktif / Cabutan), avatar, dan julukan dinamis pemain
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-4 py-2.5 text-xs font-bold text-[#161311] hover:bg-[#F3C256] transition-all shadow-md shadow-[#E8B33D]/10 cursor-pointer active:scale-95"
              >
                <UserPlus size={16} />
                <span>Tambah Pemain Baru</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 rounded-xl border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-4 py-2.5 text-xs font-bold text-[#E8B33D] hover:bg-[#E8B33D]/20 transition-colors cursor-pointer"
              >
                <ShieldAlert size={15} />
                <span>Login Admin untuk Edit/Hapus</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Count Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#332C25]">
          <div className="rounded-xl border border-[#332C25] bg-[#161311] p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-[#9C948A] tracking-wider block">
              Total Pemain
            </span>
            <span className="text-xl font-black text-[#F2EDE4] mt-0.5 block">{totalCount}</span>
            <span className="text-[10px] text-[#9C948A]">Terdaftar di Database</span>
          </div>

          <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              Warga Aktif
            </span>
            <span className="text-xl font-black text-emerald-300 mt-0.5 block">{aktifCount}</span>
            <span className="text-[10px] text-emerald-400/80">Badge Aktif</span>
          </div>

          <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
              Cabutan
            </span>
            <span className="text-xl font-black text-amber-300 mt-0.5 block">{cabutanCount}</span>
            <span className="text-[10px] text-amber-400/80">Pemain Cadangan / Tamu</span>
          </div>

          <div className="rounded-xl border border-[#E8B33D]/30 bg-[#251E17] p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-[#E8B33D] tracking-wider block">
              Mythic / Glory
            </span>
            <span className="text-xl font-black text-[#E8B33D] mt-0.5 block">{mythicCount}</span>
            <span className="text-[10px] text-[#9C948A]">Top Tier Roster</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & Sorting Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C948A]" />
          <input
            type="text"
            placeholder="Cari nama pemain atau julukan pantos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[#332C25] bg-[#1D1916] pl-9 pr-9 py-2.5 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4]"
              title="Hapus pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#1D1916] p-1 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-[#E8B33D] text-[#161311] shadow'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('Aktif')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'Aktif'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-[#9C948A] hover:text-emerald-400'
            }`}
          >
            Aktif ({aktifCount})
          </button>
          <button
            onClick={() => setStatusFilter('Cabutan')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'Cabutan'
                ? 'bg-amber-600 text-white shadow'
                : 'text-[#9C948A] hover:text-amber-400'
            }`}
          >
            Cabutan ({cabutanCount})
          </button>
        </div>

        {/* Tier Select Filter */}
        <div className="relative shrink-0">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#332C25] bg-[#1D1916] px-3.5 py-2.5 pr-8 text-xs font-bold text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Tier</option>
            {MLBB_TIER_OPTIONS.map((t) => (
              <option key={t} value={t} className="bg-[#1D1916] text-[#F2EDE4]">
                Tier {t}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C948A]"
          />
        </div>

        {/* Sorting Dropdown */}
        <div className="relative shrink-0">
          <select
            value={`${sortField}_${sortDirection}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split('_') as [PlayerSortField, PlayerSortDirection];
              setSortField(f);
              setSortDirection(d);
            }}
            className="w-full appearance-none rounded-xl border border-[#332C25] bg-[#1D1916] px-3.5 py-2.5 pr-8 text-xs font-bold text-[#E8B33D] focus:border-[#E8B33D] focus:outline-none cursor-pointer"
          >
            <option value="total_match_desc">Urut: Main Terbanyak</option>
            <option value="winRate_desc">Urut: Win Rate Tertinggi</option>
            <option value="mvp_desc">Urut: MVP Terbanyak</option>
            <option value="score_desc">Urut: Skor Klasemen Tertinggi</option>
            <option value="name_asc">Urut: Nama (A-Z)</option>
            <option value="name_desc">Urut: Nama (Z-A)</option>
            <option value="status_desc">Urut: Status (Aktif Duluan)</option>
          </select>
          <ArrowUpDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#E8B33D]"
          />
        </div>
      </div>

      {/* Showing count indicator */}
      <div className="flex items-center justify-between text-xs text-[#9C948A] px-1">
        <span>
          Menampilkan <strong className="text-[#F2EDE4]">{filteredPlayers.length}</strong> dari {totalCount} pemain
        </span>
        {(searchTerm || statusFilter !== 'ALL' || tierFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setTierFilter('ALL');
            }}
            className="inline-flex items-center gap-1 text-[#E8B33D] hover:underline cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>Reset Semua Filter</span>
          </button>
        )}
      </div>

      {/* Players List Table */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F2EDE4]">
            <thead className="border-b border-[#332C25] bg-[#161311] text-[11px] font-bold text-[#9C948A] uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSortToggle('name')}
                  className="px-4 py-3 cursor-pointer hover:text-[#F2EDE4] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Pemain</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} className="text-[#E8B33D]" /> : <ArrowDown size={12} className="text-[#E8B33D]" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('status')}
                  className="px-4 py-3 cursor-pointer hover:text-[#F2EDE4] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status Badge</span>
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ArrowUp size={12} className="text-[#E8B33D]" /> : <ArrowDown size={12} className="text-[#E8B33D]" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3">Tier MLBB</th>
                <th className="px-4 py-3">Julukan Pantos Terkini</th>
                <th
                  onClick={() => handleSortToggle('total_match')}
                  className="px-4 py-3 text-center cursor-pointer hover:text-[#F2EDE4] transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Main</span>
                    {sortField === 'total_match' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} className="text-[#E8B33D]" /> : <ArrowDown size={12} className="text-[#E8B33D]" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('winRate')}
                  className="px-4 py-3 text-center cursor-pointer hover:text-[#F2EDE4] transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Win Rate</span>
                    {sortField === 'winRate' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} className="text-[#E8B33D]" /> : <ArrowDown size={12} className="text-[#E8B33D]" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('mvp')}
                  className="px-4 py-3 text-center cursor-pointer hover:text-[#F2EDE4] transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Medali</span>
                    {sortField === 'mvp' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} className="text-[#E8B33D]" /> : <ArrowDown size={12} className="text-[#E8B33D]" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Aksi CRUD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A241E]">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#9C948A]">
                    <Users size={32} className="mx-auto mb-2 opacity-40 text-[#E8B33D]" />
                    <p className="font-semibold text-sm">Tidak ada pemain yang sesuai filter</p>
                    <p className="text-xs text-[#9C948A] mt-1">
                      Coba ganti kata kunci pencarian atau reset filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('ALL');
                        setTierFilter('ALL');
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#E8B33D]/50 bg-[#E8B33D]/10 px-3.5 py-1.5 text-xs font-bold text-[#E8B33D] hover:bg-[#E8B33D]/20 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Reset Filter & Pencarian</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player, idx) => {
                  const isAktif = player.status === 'Aktif';
                  const isGenerating = generatingId === player.id;
                  const isUpdatingThis = updatingPlayerId === player.id;

                  return (
                    <tr
                      key={`crud-player-${player.id}-${idx}`}
                      className="hover:bg-[#241F1B] transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => onSelectPlayer && onSelectPlayer(player.id)}
                          title="Klik untuk lihat profil detail"
                        >
                          <PlayerAvatar
                            nickname={player.name}
                            avatarUrl={player.avatar_url}
                            size="md"
                            className="ring-1 ring-[#332C25] group-hover:ring-[#E8B33D]/60 transition-all"
                          />
                          <div>
                            <span className="font-bold text-sm text-[#F2EDE4] group-hover:text-[#E8B33D] transition-colors block">
                              {player.name}
                            </span>
                            <span className="block text-[10px] text-[#9C948A]">
                              ID: #{player.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge with Instant Toggle */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(player)}
                          disabled={!isAdmin || isUpdatingThis}
                          title={
                            isAdmin
                              ? `Klik untuk toggle ke ${isAktif ? 'Cabutan' : 'Aktif'}`
                              : 'Hanya Admin yang bisa ubah status'
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border transition-all select-none ${
                            isAktif
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900/60'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/70 hover:bg-amber-900/60'
                          } ${isAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-90'}`}
                        >
                          {isUpdatingThis ? (
                            <RefreshCw size={10} className="animate-spin text-[#E8B33D]" />
                          ) : (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isAktif ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                              }`}
                            />
                          )}
                          <span>{player.status}</span>
                          {isAdmin && <span className="text-[10px] opacity-60 ml-0.5">⇄</span>}
                        </button>
                      </td>

                      {/* Tier Dropdown */}
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <div className="relative inline-block">
                            <select
                              value={player.tier || 'Legend'}
                              disabled={isUpdatingThis}
                              onChange={(e) => handleQuickTierChange(player, e.target.value)}
                              className="appearance-none rounded-lg border border-[#332C25] bg-[#161311] px-2.5 py-1 pr-7 text-xs font-bold text-[#E8B33D] focus:border-[#E8B33D] focus:outline-none cursor-pointer disabled:opacity-50"
                            >
                              {MLBB_TIER_OPTIONS.map((t) => (
                                <option key={t} value={t} className="bg-[#1D1916] text-[#F2EDE4]">
                                  {t}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={11}
                              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#E8B33D]"
                            />
                          </div>
                        ) : (
                          <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-[#241F1B] text-[#E8B33D] border border-[#332C25]">
                            {player.tier}
                          </span>
                        )}
                      </td>

                      {/* Julukan & Re-generate */}
                      <td className="px-4 py-3 max-w-[260px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 truncate">
                            {player.julukan ? (
                              <span className="font-medium text-xs text-[#F2EDE4]" title={player.julukan}>
                                "{player.julukan}"
                              </span>
                            ) : (
                              <span className="text-xs italic text-[#9C948A]">Belum ada julukan</span>
                            )}
                          </div>

                          {isAdmin && onGenerateJulukan && (
                            <button
                              type="button"
                              onClick={() => handleGenerateJulukanClick(player)}
                              disabled={isGenerating}
                              title="Generate julukan baru berdasarkan performa aktual"
                              className="rounded-lg p-1.5 text-[#E8B33D] hover:bg-[#2A241E] hover:text-[#F3C256] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Sparkles
                                size={14}
                                className={isGenerating ? 'animate-spin text-[#E8B33D]' : ''}
                              />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Matches Count */}
                      <td className="px-4 py-3 text-center font-bold text-xs text-[#F2EDE4]">
                        {player.total_match ?? 0}
                      </td>

                      {/* Win Rate */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-xs ${
                            (player.winRate ?? 50) >= 60
                              ? 'text-emerald-400'
                              : (player.winRate ?? 50) >= 50
                              ? 'text-[#E8B33D]'
                              : 'text-rose-400'
                          }`}
                        >
                          {(player.winRate ?? 0).toFixed(1)}%
                        </span>
                      </td>

                      {/* Medals */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold">
                          <span className="text-[#E8B33D]" title="MVP">
                            👑 {player.medals?.MVP ?? 0}
                          </span>
                          <span className="text-stone-400">·</span>
                          <span className="text-[#A75D28]" title="Coklat (Semen)">
                            🧱 {player.medals?.Coklat ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons (Edit & Delete) */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(player)}
                                className="rounded-lg border border-[#332C25] bg-[#1D1916] p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] hover:border-[#E8B33D]/50 transition-colors cursor-pointer"
                                title="Edit data pemain lengkap (Create / Update)"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPlayer(player)}
                                className="rounded-lg border border-rose-900/30 bg-rose-950/20 p-1.5 text-rose-400 hover:bg-rose-900/40 hover:text-rose-200 transition-colors cursor-pointer"
                                title="Hapus pemain dari database (Delete)"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectPlayer && onSelectPlayer(player.id)}
                              className="rounded-lg border border-[#332C25] px-2.5 py-1 text-[11px] font-semibold text-[#9C948A] hover:text-[#F2EDE4]"
                            >
                              Lihat Profil
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD PLAYER MODAL (CREATE) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#332C25] bg-[#1D1916] p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-[#E8B33D]" />
                <h3 className="text-base font-bold text-[#F2EDE4]">Tambah Pemain Baru (Create)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">
                  Nickname Pemain <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Farhan, Bang Jago, Mas Bro"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2.5 text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9C948A] font-semibold mb-1">Status Keanggotaan:</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as 'Aktif' | 'Cabutan')}
                    className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2.5 text-[#F2EDE4] focus:outline-none cursor-pointer"
                  >
                    <option value="Aktif">Aktif (Warga Tetap)</option>
                    <option value="Cabutan">Cabutan (Tamu / Cadangan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#9C948A] font-semibold mb-1">Tier / Rank MLBB:</label>
                  <select
                    value={addTier}
                    onChange={(e) => setAddTier(e.target.value)}
                    className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2.5 text-[#F2EDE4] focus:outline-none cursor-pointer"
                  >
                    {MLBB_TIER_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">
                  Julukan Khusus (Opsional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Preman Late Game, Semen Cor Tiga Roda"
                    value={addJulukan}
                    onChange={(e) => setAddJulukan(e.target.value)}
                    className="flex-1 rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2.5 text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const suggestions = [
                        'Preman Late Game',
                        'Pabrik Coklat Meleleh',
                        'Tulang Punggung Bungkuk 90°',
                        'Spesialis Retri Indomaret',
                        'Joker Titipan Pengacau Winrate',
                        'Duta Asik Solo Lane',
                        'Lord Pembawa Kemenangan',
                      ];
                      setAddJulukan(suggestions[Math.floor(Math.random() * suggestions.length)]);
                    }}
                    className="rounded-xl border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-3 py-2 text-xs font-bold text-[#E8B33D] hover:bg-[#E8B33D]/20 cursor-pointer shrink-0"
                  >
                    Saran
                  </button>
                </div>
              </div>

              {/* Avatar Input with Live Preview */}
              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">
                  URL Avatar Kustom (Opsional):
                </label>
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <PlayerAvatar
                      nickname={addName.trim() || 'Pemain'}
                      avatarUrl={addAvatarUrl.trim() || undefined}
                      size="lg"
                      className="ring-2 ring-[#E8B33D]/40 shadow"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://... URL gambar avatar"
                      value={addAvatarUrl}
                      onChange={(e) => setAddAvatarUrl(e.target.value)}
                      className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2.5 text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#9C948A] mt-1 block">
                      Pratinjau foto langsung diperbarui di sebelah kiri.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#332C25]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[#332C25] px-4 py-2.5 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-5 py-2.5 text-xs font-bold text-[#161311] hover:bg-[#F3C256] disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {isSubmittingAdd ? <RefreshCw size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  <span>{isSubmittingAdd ? 'Menyimpan...' : 'Simpan ke Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PLAYER MODAL (UPDATE) */}
      {/* ========================================================================= */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#332C25] bg-[#1D1916] p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#E8B33D]" />
                <h3 className="text-base font-bold text-[#F2EDE4]">
                  Edit Data Pemain: {editingPlayer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="rounded-lg p-1 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">
                  Nickname Pemain <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2.5 text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9C948A] font-semibold mb-1">
                    Status Keanggotaan:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'Aktif' | 'Cabutan')}
                    className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2.5 text-[#F2EDE4] focus:outline-none cursor-pointer"
                  >
                    <option value="Aktif">Aktif (Warga Tetap)</option>
                    <option value="Cabutan">Cabutan (Tamu / Cadangan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#9C948A] font-semibold mb-1">Tier / Rank MLBB:</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                    className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2.5 text-[#F2EDE4] focus:outline-none cursor-pointer"
                  >
                    {MLBB_TIER_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">
                  Julukan Pemain Pantos:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editJulukan}
                    onChange={(e) => setEditJulukan(e.target.value)}
                    placeholder="Julukan unik pemain..."
                    className="flex-1 rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2.5 text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
                  />
                  {onGenerateJulukan && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await onGenerateJulukan(editingPlayer.id);
                          if (res) {
                            setEditJulukan(res);
                            showToast(`Julukan dihasilkan: "${res}"`);
                          }
                        } catch (e: any) {
                          showToast('Gagal generate', 'error');
                        }
                      }}
                      className="rounded-xl border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-3 py-2 text-xs font-bold text-[#E8B33D] hover:bg-[#E8B33D]/20 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles size={12} />
                      <span>AI Generate</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar input with Live Preview */}
              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">
                  URL Avatar Kustom:
                </label>
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <PlayerAvatar
                      nickname={editName.trim() || editingPlayer.name}
                      avatarUrl={editAvatarUrl.trim() || undefined}
                      size="lg"
                      className="ring-2 ring-[#E8B33D]/40 shadow"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://... URL gambar avatar"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2.5 text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#9C948A] mt-1 block">
                      Pratinjau foto langsung diperbarui di sebelah kiri.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#332C25]">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="rounded-xl border border-[#332C25] px-4 py-2.5 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-5 py-2.5 text-xs font-bold text-[#161311] hover:bg-[#F3C256] disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {isSubmittingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Edit3 size={13} />}
                  <span>{isSubmittingEdit ? 'Menyimpan...' : 'Perbarui Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL (DELETE) */}
      {/* ========================================================================= */}
      {deletingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/50 bg-[#1D1916] p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="rounded-xl bg-rose-950/60 p-2.5 border border-rose-800/40">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F2EDE4]">Hapus Pemain dari Database</h3>
                <p className="text-xs text-rose-300/80">Tindakan ini permanen</p>
              </div>
            </div>

            <p className="text-xs text-[#9C948A] leading-relaxed">
              Apakah Anda yakin ingin menghapus pemain{' '}
              <strong className="text-[#F2EDE4]">"{deletingPlayer.name}"</strong>? Data dokumen pemain
              akan dihapus dari <span className="text-[#E8B33D]">Cloud Firestore</span>, database backend, dan daftar roster Laga Amal.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#332C25]">
              <button
                type="button"
                onClick={() => setDeletingPlayer(null)}
                disabled={isSubmittingDelete}
                className="rounded-xl border border-[#332C25] px-4 py-2.5 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitDelete}
                disabled={isSubmittingDelete}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer shadow-md"
              >
                {isSubmittingDelete ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                <span>{isSubmittingDelete ? 'Menghapus...' : 'Ya, Hapus Pemain'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
