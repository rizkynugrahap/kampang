import React, { useState } from 'react';
import { X, Lock, KeyRound, ShieldAlert, Check } from 'lucide-react';
import { verifyAdminLogin } from '../services/firestoreSync';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('admin@pantos.ml');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await verifyAdminLogin(email, password);
      if (result.success) {
        localStorage.setItem('pantos_admin_token', 'admin-pantos-token-' + Date.now());
        onLoginSuccess();
        onClose();
      } else {
        setError(result.error || 'Password atau email admin salah');
      }
    } catch (err: any) {
      setError('Gagal menghubungkan ke Firestore.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="admin-login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="admin-login-modal-card"
        className="w-full max-w-sm rounded-2xl border border-[#332C25] bg-[#1D1916] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#332C25] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F1B] text-[#E8B33D]">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#F2EDE4]">Login Admin Pantos</h3>
              <p className="text-[11px] text-[#9C948A]">
                Akses draft & input pertandingan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-200">
              <ShieldAlert size={14} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block font-medium text-xs text-[#9C948A]">
              Email Admin
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4] focus:outline-hidden"
              placeholder="admin@pantos.ml"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-xs text-[#9C948A]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#F2EDE4] focus:outline-hidden"
              placeholder="Masukan Password"
            />
          </div>


          <div className="mt-5 flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#332C25] bg-[#241F1B] py-2.5 font-medium text-xs text-[#F2EDE4]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#E8B33D] py-2.5 font-bold text-xs text-[#161311] hover:bg-[#d8a93a]"
            >
              {loading ? 'Memverifikasi...' : 'Masuk Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
