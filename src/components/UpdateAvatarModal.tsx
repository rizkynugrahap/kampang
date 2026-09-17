import React, { useState, useRef } from 'react';
import { X, Upload, Link, Sparkles, Check, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Player } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { PRESET_PLAYER_AVATARS, getPlayerAvatarUrl, normalizeImageUrl } from '../data/playerAvatars';

interface UpdateAvatarModalProps {
  isOpen: boolean;
  player: Player;
  onClose: () => void;
  onSave: (playerId: number | string, newAvatarUrl: string) => Promise<boolean> | boolean;
}

const AVATAR_PRESETS = [
  { name: 'Assassin Shadow', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AssassinShadow&backgroundColor=241f1b,332c25' },
  { name: 'Mage Arcane', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MageArcane&backgroundColor=b6e3f4,c0aede' },
  { name: 'Tank Titan', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TankTitan&backgroundColor=ffd5dc,ffdfbf' },
  { name: 'Marksman Sniper', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarksmanSniper&backgroundColor=c0aede,d1d4f9' },
  { name: 'Fighter Warrior', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FighterWarrior&backgroundColor=ffdfbf,ffd5dc' },
  { name: 'Support Angel', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SupportAngel&backgroundColor=b6e3f4,d1d4f9' },
  { name: 'Cyber Samurai', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSamurai&backgroundColor=241f1b' },
  { name: 'Gold Lord', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GoldLord&backgroundColor=e8b33d,b8764a' },
];

export const UpdateAvatarModal: React.FC<UpdateAvatarModalProps> = ({
  isOpen,
  player,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(player.avatar_url || '');
  const [inputUrl, setInputUrl] = useState<string>(player.avatar_url || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap pilih file gambar (PNG, JPG, JPEG, WEBP, SVG).');
      return;
    }

    // Limit to 5MB raw
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 5MB.');
      return;
    }

    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      // Compress/resize down to 256x256 max to optimize storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const isPng = file.type === 'image/png';
          const mime = isPng ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(mime, 0.9);
          setPreviewUrl(compressed);
        } else {
          setPreviewUrl(rawDataUrl);
        }
      };
      img.onerror = () => {
        setPreviewUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Handle URL change
  const handleApplyUrl = () => {
    if (!inputUrl.trim()) {
      setErrorMessage('Silakan masukkan link/URL gambar yang valid.');
      return;
    }
    const clean = normalizeImageUrl(inputUrl);
    setErrorMessage('');
    setInputUrl(clean);
    setPreviewUrl(clean);
  };

  // Handle reset to default
  const handleResetToDefault = () => {
    setPreviewUrl('');
    setInputUrl('');
    setErrorMessage('');
  };

  // Handle Save
  const handleSave = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      let finalUrl = previewUrl;
      // If user typed in URL tab, automatically normalize and apply even if they didn't click Terapkan first
      if (activeTab === 'url' && inputUrl.trim()) {
        finalUrl = normalizeImageUrl(inputUrl);
      }

      const success = await onSave(player.id, finalUrl);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Gagal menyimpan foto profil. Coba lagi.');
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan saat menyimpan foto.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="update-avatar-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        id="update-avatar-modal-card"
        className="w-full max-w-lg rounded-2xl border border-[#332C25] bg-[#1D1916] text-[#F2EDE4] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#332C25] px-6 py-4 bg-[#241F1B]/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8B33D]/20 text-[#E8B33D] border border-[#E8B33D]/30">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="font-black text-base text-[#F2EDE4] tracking-tight">
                Update Foto Profil Pemain
              </h3>
              <p className="text-xs text-[#9C948A]">
                Pemain: <span className="text-[#E8B33D] font-bold">{player.name}</span> ({player.tier})
              </p>
            </div>
          </div>

          <button
            id="btn-close-avatar-modal"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Live Avatar Preview */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 p-4 rounded-xl border border-[#332C25] bg-[#241F1B]/40 text-center sm:text-left">
            <div className="relative">
              <PlayerAvatar
                name={player.name}
                avatarUrl={previewUrl || undefined}
                size="xl"
                status={player.status}
                showStatusDot
              />
              <span className="absolute -bottom-1 -right-1 rounded-full bg-[#E8B33D] text-[#161311] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow">
                Preview
              </span>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sm text-[#F2EDE4]">
                Tampilan Avatar {player.name}
              </p>
              <p className="text-xs text-[#9C948A] max-w-xs">
                {previewUrl
                  ? previewUrl.startsWith('data:')
                    ? 'Foto kustom lokal tersimpan (Base64)'
                    : 'Menggunakan gambar dari tautan eksternal'
                  : 'Menggunakan avatar default resmi Pantos'}
              </p>
              {previewUrl && (
                <button
                  id="btn-reset-avatar"
                  onClick={handleResetToDefault}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  <RotateCcw size={12} />
                  Reset ke Avatar Bawaan
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#332C25] gap-2">
            <button
              id="tab-avatar-upload"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'upload'
                  ? 'border-[#E8B33D] text-[#E8B33D]'
                  : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
            >
              <Upload size={14} />
              <span>Upload Gambar</span>
            </button>

            <button
              id="tab-avatar-url"
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'url'
                  ? 'border-[#E8B33D] text-[#E8B33D]'
                  : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
            >
              <Link size={14} />
              <span>Tautan / URL</span>
            </button>

            <button
              id="tab-avatar-presets"
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'presets'
                  ? 'border-[#E8B33D] text-[#E8B33D]'
                  : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
            >
              <Sparkles size={14} />
              <span>Preset Karakter</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="avatar-file-input"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-[#332C25] hover:border-[#E8B33D]/60 bg-[#241F1B]/30 hover:bg-[#241F1B]/60 transition-all cursor-pointer group text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8B33D]/10 text-[#E8B33D] group-hover:scale-110 transition-transform mb-3">
                  <Upload size={22} />
                </div>
                <p className="text-sm font-bold text-[#F2EDE4]">
                  Klik untuk Memilih File atau Seret ke Sini
                </p>
                <p className="text-xs text-[#9C948A] mt-1">
                  Mendukung format PNG, JPG, JPEG, WEBP, atau SVG (Maks. 5MB)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: URL Link */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#9C948A]">
                Masukkan URL Gambar Langsung (Direct Link):
              </label>
              <div className="flex gap-2">
                <input
                  id="avatar-url-input"
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png atau link GitHub/Discord"
                  className="flex-1 rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2.5 text-xs text-[#F2EDE4] placeholder-[#9C948A]/50 focus:border-[#E8B33D] focus:outline-none"
                />
                <button
                  id="btn-apply-avatar-url"
                  onClick={handleApplyUrl}
                  className="rounded-xl bg-[#332C25] hover:bg-[#3D352E] px-4 py-2 text-xs font-bold text-[#F2EDE4] transition-colors cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
              <p className="text-[11px] text-[#9C948A]">
                Tips: Pastikan URL berakhiran .jpg, .png, .webp, atau gambar publik yang dapat diakses langsung.
              </p>
            </div>
          )}

          {/* Tab 3: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#9C948A]">
                Pilih Avatar Role & Karakter MLBB Pantos:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto pr-1">
                {AVATAR_PRESETS.map((p, idx) => {
                  const isSelected = previewUrl === p.url;
                  return (
                    <button
                      key={`preset-${p.name}-${idx}`}
                      onClick={() => {
                        setPreviewUrl(p.url);
                        setInputUrl(p.url);
                      }}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#E8B33D] bg-[#E8B33D]/15 shadow-md'
                          : 'border-[#332C25] bg-[#241F1B] hover:border-[#9C948A]'
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="h-12 w-12 rounded-full bg-[#161311] border border-[#332C25] object-cover"
                      />
                      <span className="text-[11px] font-semibold text-[#F2EDE4] truncate w-full text-center">
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#332C25] px-6 py-4 bg-[#241F1B]/60">
          <button
            id="btn-cancel-avatar-modal"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border border-[#332C25] bg-[#241F1B] px-4 py-2 text-xs font-bold text-[#9C948A] hover:text-[#F2EDE4] transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            id="btn-save-avatar"
            onClick={handleSave}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-xl bg-[#E8B33D] px-5 py-2 text-xs font-black text-[#161311] hover:bg-[#F2C04D] transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            <Check size={14} />
            <span>{isProcessing ? 'Menyimpan...' : 'Simpan Foto Profil'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
