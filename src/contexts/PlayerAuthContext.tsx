import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { KeyRound, X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { Player, PlayerAuthSession } from '../types';
import { SearchablePlayerSelect } from '../components/SearchablePlayerSelect';
import { verifyOrSetPlayerPin, changePlayerPin, checkHasPin } from '../services/chatService';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/storage';

// Session is intentionally kept under the same storage key it always used
// (originally chat-only) so players who are already logged in don't get
// logged out by this change — the login now simply also unlocks the
// player-profile editor, not just the chat.
const AUTH_STORAGE_KEY = 'pantos_chat_active_session';

interface PlayerAuthContextValue {
  session: PlayerAuthSession | null;
  isLoggedIn: boolean;
  /** Opens the shared login modal. Pass a player name to pre-select it (e.g. when someone tries to edit a specific profile while logged out). */
  openLogin: (prefillPlayerName?: string) => void;
  openChangePin: () => void;
  logout: () => void;
}

const PlayerAuthContext = createContext<PlayerAuthContextValue | null>(null);

export const usePlayerAuth = (): PlayerAuthContextValue => {
  const ctx = useContext(PlayerAuthContext);
  if (!ctx) {
    throw new Error('usePlayerAuth() harus dipanggil di dalam <PlayerAuthProvider>.');
  }
  return ctx;
};

interface PlayerAuthProviderProps {
  players: Player[];
  children: React.ReactNode;
}

export const PlayerAuthProvider: React.FC<PlayerAuthProviderProps> = ({ players, children }) => {
  const [session, setSession] = useState<PlayerAuthSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = safeGetItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const isLoggedIn = Boolean(session && session.isLoggedIn);

  // Keep the logged-in identity's avatar/tier/julukan fresh if the roster changes elsewhere
  useEffect(() => {
    if (!session || !players.length) return;
    const currentInRoster = players.find(
      (p) => p.name.trim().toLowerCase() === session.playerName.trim().toLowerCase()
    );
    if (currentInRoster) {
      const updatedSession: PlayerAuthSession = {
        ...session,
        avatar_url: currentInRoster.avatar_url,
        tier: currentInRoster.tier,
        julukan: currentInRoster.julukan,
      };
      if (
        session.avatar_url !== updatedSession.avatar_url ||
        session.tier !== updatedSession.tier ||
        session.julukan !== updatedSession.julukan
      ) {
        setSession(updatedSession);
        safeSetItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession));
      }
    }
  }, [players, session]);

  // --- Login modal state ---
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [isNewPinUser, setIsNewPinUser] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // --- Change PIN modal state ---
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState<string | null>(null);

  // Check whether the selected player already has a PIN (new vs existing account)
  useEffect(() => {
    if (!selectedPlayerName) {
      setIsNewPinUser(false);
      return;
    }
    checkHasPin(selectedPlayerName).then((hasPin) => {
      setIsNewPinUser(!hasPin);
    });
  }, [selectedPlayerName]);

  const openLogin = useCallback((prefillPlayerName?: string) => {
    setLoginError(null);
    setEnteredPin('');
    setSelectedPlayerName(prefillPlayerName || '');
    setIsLoginModalOpen(true);
  }, []);

  const closeLogin = useCallback(() => setIsLoginModalOpen(false), []);

  const openChangePin = useCallback(() => {
    setOldPin('');
    setNewPin('');
    setConfirmNewPin('');
    setChangePinError(null);
    setChangePinSuccess(null);
    setIsChangePinModalOpen(true);
  }, []);

  const closeChangePin = useCallback(() => setIsChangePinModalOpen(false), []);

  const logout = useCallback(() => {
    setSession(null);
    safeRemoveItem(AUTH_STORAGE_KEY);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerName) {
      setLoginError('Pilih nama pemain terlebih dahulu.');
      return;
    }
    if (!enteredPin.trim()) {
      setLoginError('Masukkan PIN Anda (4-8 karakter/angka).');
      return;
    }

    setIsSubmittingAuth(true);
    setLoginError(null);

    try {
      const res = await verifyOrSetPlayerPin(selectedPlayerName, enteredPin);
      if (!res.success) {
        setLoginError(res.error || 'PIN tidak valid.');
        setIsSubmittingAuth(false);
        return;
      }

      const playerObj = players.find(
        (p) => p.name.trim().toLowerCase() === selectedPlayerName.trim().toLowerCase()
      );

      const newSession: PlayerAuthSession = {
        playerId: playerObj ? playerObj.id : selectedPlayerName,
        playerName: selectedPlayerName,
        avatar_url: playerObj?.avatar_url,
        tier: playerObj?.tier || 'Warrior',
        julukan: playerObj?.julukan || 'Pemain Laga Amal Pantos',
        isLoggedIn: true,
      };

      setSession(newSession);
      safeSetItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
      closeLogin();
      setEnteredPin('');
      setLoginError(null);
    } catch (err: any) {
      setLoginError('Terjadi kesalahan saat verifikasi PIN.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!oldPin) {
      setChangePinError('Masukkan PIN lama.');
      return;
    }
    if (newPin.length < 4 || newPin.length > 8) {
      setChangePinError('PIN baru harus 4-8 digit.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setChangePinError('Konfirmasi PIN baru tidak cocok.');
      return;
    }

    setIsSubmittingAuth(true);
    setChangePinError(null);
    setChangePinSuccess(null);

    try {
      const res = await changePlayerPin(session.playerName, oldPin, newPin);
      if (!res.success) {
        setChangePinError(res.error || 'Gagal mengubah PIN.');
      } else {
        setChangePinSuccess('PIN berhasil diubah!');
        setOldPin('');
        setNewPin('');
        setConfirmNewPin('');
        setTimeout(() => {
          closeChangePin();
          setChangePinSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setChangePinError('Terjadi kesalahan saat mengubah PIN.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <PlayerAuthContext.Provider value={{ session, isLoggedIn, openLogin, openChangePin, logout }}>
      {children}

      {/* MODAL: LOGIN AKUN PEMAIN — dipakai bersama oleh Chat & Profil Pemain */}
      {isLoginModalOpen && (
        <div
          id="player-account-login-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#332C25] bg-[#1D1916] text-[#F2EDE4] shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#332C25] px-6 py-4 bg-[#241F1B]/60 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8B33D]/20 text-[#E8B33D] border border-[#E8B33D]/30">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#F2EDE4]">Login Akun Pemain</h3>
                  <p className="text-xs text-[#9C948A]">Untuk Chat Lobby &amp; Profil Pemain</p>
                </div>
              </div>
              <button
                onClick={closeLogin}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              {loginError && (
                <div className="rounded-xl bg-red-950/50 border border-red-500/50 p-3 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Player Selector with Search */}
              <div>
                <label className="block text-xs font-bold text-[#F2EDE4] mb-1.5">
                  Pilih Nama Anda dari Roster
                </label>
                <SearchablePlayerSelect
                  id="login-player-select"
                  players={players}
                  selectedPlayerName={selectedPlayerName}
                  onSelectPlayer={(name) => {
                    setSelectedPlayerName(name);
                    setLoginError(null);
                  }}
                  placeholder="-- Cari & Pilih Nama Anda --"
                />
              </div>

              {/* PIN Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#F2EDE4]">
                    PIN Akun (4-8 karakter)
                  </label>
                  {isNewPinUser && selectedPlayerName && (
                    <span className="text-[10px] text-[#E8B33D] font-semibold bg-[#E8B33D]/10 px-2 py-0.5 rounded-full border border-[#E8B33D]/30">
                      Baru! Buat PIN pertama Anda
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="login-pin-input"
                    type={showPinText ? 'text' : 'password'}
                    maxLength={8}
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    placeholder={
                      isNewPinUser
                        ? 'Buat PIN baru (misal: 1234)'
                        : 'Masukkan PIN rahasia Anda'
                    }
                    className="w-full rounded-xl bg-[#161311] border border-[#332C25] px-3.5 py-2.5 text-sm text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none focus:ring-1 focus:ring-[#E8B33D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinText(!showPinText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4] cursor-pointer"
                  >
                    {showPinText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-[#9C948A] mt-1.5 leading-normal">
                  {isNewPinUser
                    ? 'Pemain ini belum memiliki PIN. PIN yang Anda masukkan akan disimpan sebagai PIN akun Anda.'
                    : 'Akun ini dipakai untuk chat lobby maupun mengubah foto & data di profil pemain Anda sendiri.'}
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeLogin}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-login-pin-btn"
                  type="submit"
                  disabled={isSubmittingAuth || !selectedPlayerName || !enteredPin}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAuth ? (
                    <span>Memproses...</span>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{isNewPinUser ? 'Simpan PIN & Masuk' : 'Masuk ke Akun'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UBAH PIN */}
      {isChangePinModalOpen && session && (
        <div
          id="player-account-change-pin-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#332C25] bg-[#1D1916] text-[#F2EDE4] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#332C25] px-6 py-4 bg-[#241F1B]/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8B33D]/20 text-[#E8B33D] border border-[#E8B33D]/30">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#F2EDE4]">Ubah PIN Akun</h3>
                  <p className="text-xs text-[#9C948A]">{session.playerName}</p>
                </div>
              </div>
              <button
                onClick={closeChangePin}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePinSubmit} className="p-6 space-y-4">
              {changePinError && (
                <div className="rounded-xl bg-red-950/50 border border-red-500/50 p-3 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{changePinError}</span>
                </div>
              )}
              {changePinSuccess && (
                <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/50 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <Check size={14} className="shrink-0" />
                  <span>{changePinSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#F2EDE4] mb-1.5">
                  PIN Lama
                </label>
                <input
                  id="change-pin-old-input"
                  type="password"
                  maxLength={8}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="Masukkan PIN lama"
                  className="w-full rounded-xl bg-[#161311] border border-[#332C25] px-3.5 py-2.5 text-sm text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F2EDE4] mb-1.5">
                  PIN Baru (4-8 karakter)
                </label>
                <input
                  id="change-pin-new-input"
                  type="password"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Masukkan PIN baru"
                  className="w-full rounded-xl bg-[#161311] border border-[#332C25] px-3.5 py-2.5 text-sm text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F2EDE4] mb-1.5">
                  Konfirmasi PIN Baru
                </label>
                <input
                  id="change-pin-confirm-input"
                  type="password"
                  maxLength={8}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  placeholder="Ulangi PIN baru"
                  className="w-full rounded-xl bg-[#161311] border border-[#332C25] px-3.5 py-2.5 text-sm text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeChangePin}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-change-pin-btn"
                  type="submit"
                  disabled={isSubmittingAuth || !oldPin || !newPin || !confirmNewPin}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {isSubmittingAuth ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PlayerAuthContext.Provider>
  );
};
