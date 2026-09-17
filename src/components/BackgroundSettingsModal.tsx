import React, { useState, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Upload,
  Check,
  RotateCcw,
  AlertCircle,
  Type,
  Palette,
  Sparkles,
  Sliders,
  Eye,
} from 'lucide-react';

export const DEFAULT_GIT_BACKGROUND_URL =
  'https://raw.githubusercontent.com/rizkynugrahap/kampang/main/src/data/bacground.png';

export interface ThemeConfig {
  bgUrl: string;
  bgOpacity: number;
  logoType: 'text' | 'image';
  logoUrl: string;
  logoText: string;
  brandName: string;
  slogan: string;
  logoSize?: number;
  logoFit?: 'contain' | 'cover';
  logoShape?: 'rounded' | 'circle' | 'none';
  headerBgColor: string;
  activeButtonColor: string;
  activeButtonTextColor: string;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  bgUrl: DEFAULT_GIT_BACKGROUND_URL,
  bgOpacity: 60,
  logoType: 'text',
  logoUrl: '',
  logoText: 'LP',
  brandName: 'FRATERNITE- LAGA AMAL',
  slogan: 'Sistem Papan Klasemen Season & Tracker Medali Komunitas Pantos',
  logoSize: 52,
  logoFit: 'contain',
  logoShape: 'rounded',
  headerBgColor: '#1D1916',
  activeButtonColor: '#E8B33D',
  activeButtonTextColor: '#161311',
};

/**
 * Optimasi gambar logo agar tidak pecah/blur saat ditampilkan di layar retina,
 * sekaligus menjaga ukuran file tetap efisien untuk disimpan di Cloud Firestore.
 */
export function optimizeLogoImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resolusi tinggi hingga 512px untuk memastikan emblem dan teks logo tetap tajam
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Kualitas rendering bi-cubic agar garis lambang & teks tidak blur/pecah
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Pertahankan transparansi PNG asli
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const HEADER_COLOR_PRESETS = [
  { name: 'Obsidian Charcoal', hex: '#1D1916', desc: 'Klasik Gelap' },
  { name: 'Pitch Black', hex: '#0D0C0B', desc: 'Hitam Murni' },
  { name: 'Slate Midnight', hex: '#0F172A', desc: 'Biru Malam' },
  { name: 'Deep Navy', hex: '#111827', desc: 'Navy Formal' },
  { name: 'Royal Purple', hex: '#200B3B', desc: 'Ungu Mistik' },
  { name: 'Emerald Dark', hex: '#09261E', desc: 'Hijau Hutan' },
  { name: 'Crimson Burgundy', hex: '#2D0B0E', desc: 'Merah Marun' },
  { name: 'Espresso Bronze', hex: '#23180F', desc: 'Cokelat Hangat' },
];

export const ACTIVE_BUTTON_COLOR_PRESETS = [
  { name: 'Gold MLBB', hex: '#E8B33D', textHex: '#161311' },
  { name: 'Emerald Green', hex: '#10B981', textHex: '#062E20' },
  { name: 'Cyan Ocean', hex: '#06B6D4', textHex: '#082F37' },
  { name: 'Electric Violet', hex: '#8B5CF6', textHex: '#ffffff' },
  { name: 'Ruby Crimson', hex: '#F43F5E', textHex: '#ffffff' },
  { name: 'Blaze Orange', hex: '#F97316', textHex: '#ffffff' },
  { name: 'Sapphire Blue', hex: '#3B82F6', textHex: '#ffffff' },
  { name: 'Pure White', hex: '#F8FAFC', textHex: '#0F172A' },
];

export function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#161311';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#161311' : '#ffffff';
}

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeConfig?: ThemeConfig;
  onSaveTheme?: (config: ThemeConfig) => void;
  // Legacy props compatibility
  currentBgUrl?: string;
  currentOpacity?: number;
  onSaveBgUrl?: (url: string) => void;
  onSaveOpacity?: (opacity: number) => void;
}

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  isOpen,
  onClose,
  themeConfig,
  onSaveTheme,
  currentBgUrl,
  currentOpacity = 60,
  onSaveBgUrl,
  onSaveOpacity,
}) => {
  // Active Tab: 'brand' | 'colors' | 'background'
  const [activeTab, setActiveTab] = useState<'brand' | 'colors' | 'background'>('brand');

  // Form State
  const initialTheme: ThemeConfig = {
    ...DEFAULT_THEME_CONFIG,
    ...(themeConfig || {}),
    bgUrl: currentBgUrl || themeConfig?.bgUrl || DEFAULT_GIT_BACKGROUND_URL,
    bgOpacity: currentOpacity ?? themeConfig?.bgOpacity ?? 60,
  };

  const [formConfig, setFormConfig] = useState<ThemeConfig>(initialTheme);
  const [errorStatus, setErrorStatus] = useState<string>('');

  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens with fresh props
  React.useEffect(() => {
    if (isOpen) {
      setFormConfig({
        ...DEFAULT_THEME_CONFIG,
        ...(themeConfig || {}),
        bgUrl: currentBgUrl || themeConfig?.bgUrl || DEFAULT_GIT_BACKGROUND_URL,
        bgOpacity: currentOpacity ?? themeConfig?.bgOpacity ?? 60,
      });
      setErrorStatus('');
    }
  }, [isOpen, themeConfig, currentBgUrl, currentOpacity]);

  if (!isOpen) return null;

  // Handle Logo file upload with automatic high-res optimization
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorStatus('Harap pilih file gambar logo yang valid (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      setErrorStatus('');
      const optimizedDataUrl = await optimizeLogoImage(file);
      setFormConfig((prev) => ({
        ...prev,
        logoType: 'image',
        logoUrl: optimizedDataUrl,
      }));
    } catch (err) {
      console.warn('Gagal memproses gambar logo:', err);
      setErrorStatus('Gagal memproses gambar logo. Coba gunakan gambar lain.');
    }
  };

  // Handle Background file upload
  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorStatus('Harap unggah file gambar (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormConfig((prev) => ({
          ...prev,
          bgUrl: dataUrl,
        }));
        setErrorStatus('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToGitBg = () => {
    setFormConfig((prev) => ({
      ...prev,
      bgUrl: DEFAULT_GIT_BACKGROUND_URL,
    }));
    setErrorStatus('');
  };

  const handleResetAllDefaults = () => {
    setFormConfig(DEFAULT_THEME_CONFIG);
    setErrorStatus('');
  };

  const handleSave = () => {
    // Validation
    if (formConfig.bgUrl.startsWith('data:') && formConfig.bgUrl.length > 750_000) {
      setErrorStatus(
        'Ukuran file background terlalu besar untuk disinkronkan ke cloud (maks. ±500KB). Kompres gambarnya dulu atau gunakan URL gambar.'
      );
      return;
    }

    if (formConfig.logoUrl.startsWith('data:') && formConfig.logoUrl.length > 350_000) {
      setErrorStatus('Ukuran file logo terlalu besar (maks. ±250KB). Kompres gambarnya dulu.');
      return;
    }

    if (onSaveTheme) {
      onSaveTheme(formConfig);
    }
    if (onSaveBgUrl) {
      onSaveBgUrl(formConfig.bgUrl);
    }
    if (onSaveOpacity) {
      onSaveOpacity(formConfig.bgOpacity);
    }
    onClose();
  };

  return (
    <div
      id="bg-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="bg-settings-modal-card"
        className="w-full max-w-xl rounded-2xl border border-[#332C25] bg-[#1D1916] text-[#F2EDE4] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#332C25] px-5 py-3.5 bg-[#241F1B]/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md border"
              style={{
                backgroundColor: `${formConfig.activeButtonColor}20`,
                borderColor: `${formConfig.activeButtonColor}40`,
                color: formConfig.activeButtonColor,
              }}
            >
              <Palette size={18} />
            </div>
            <div>
              <h3 className="font-black text-base text-[#F2EDE4] tracking-tight">
                Pengaturan Tampilan & Tema
              </h3>
              <p className="text-xs text-[#9C948A]">
                Kustomisasi Logo, Brand, Header, Warna & Background
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Mini Preview Banner */}
        <div className="border-b border-[#332C25] p-3 sm:p-4 bg-[#141210] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#9C948A] uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={12} className="text-[#E8B33D]" />
              <span>Pratinjau Live Header & Tombol Aktif</span>
            </span>
            <span className="text-[10px] text-[#9C948A]">Real-time preview</span>
          </div>

          {/* Simulated Header Container */}
          <div
            className="rounded-xl border border-[#332C25] p-3 transition-all duration-200 shadow-inner flex flex-col gap-2.5"
            style={{
              backgroundColor: formConfig.headerBgColor,
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Top row: Logo + Brand + Action */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {formConfig.logoType === 'image' && formConfig.logoUrl ? (
                  <div
                    className={`flex items-center justify-center shrink-0 transition-all ${
                      formConfig.logoShape === 'circle'
                        ? 'rounded-full overflow-hidden border border-[#332C25] bg-[#161311]/60'
                        : formConfig.logoShape === 'none'
                        ? 'bg-transparent'
                        : 'rounded-xl overflow-hidden border border-[#332C25] bg-[#161311]/60'
                    }`}
                    style={{
                      height: `${Math.min(formConfig.logoSize || 52, 60)}px`,
                      minWidth: formConfig.logoShape === 'none' ? 'auto' : `${Math.min(formConfig.logoSize || 52, 60)}px`,
                      maxWidth: '160px',
                    }}
                  >
                    <img
                      src={formConfig.logoUrl}
                      alt="Logo Preview"
                      className="h-full w-auto max-w-full transition-all"
                      style={{
                        maxHeight: `${Math.min(formConfig.logoSize || 52, 60)}px`,
                        objectFit: formConfig.logoFit || 'contain',
                        imageRendering: 'auto',
                      }}
                      onError={() => {
                        setErrorStatus('Gambar logo tidak dapat dimuat. Pastikan file valid.');
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="flex shrink-0 items-center justify-center rounded-xl shadow font-black text-sm transition-colors"
                    style={{
                      height: `${Math.min(formConfig.logoSize || 48, 54)}px`,
                      width: `${Math.min(formConfig.logoSize || 48, 54)}px`,
                      backgroundColor: formConfig.activeButtonColor,
                      color: formConfig.activeButtonTextColor,
                    }}
                  >
                    {formConfig.logoText || 'LP'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs sm:text-sm font-black text-[#F2EDE4] truncate tracking-tight">
                      {formConfig.brandName || 'FRATERNITE- LAGA AMAL'}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.2 text-[9px] font-bold shrink-0 border"
                      style={{
                        backgroundColor: `${formConfig.activeButtonColor}25`,
                        borderColor: `${formConfig.activeButtonColor}50`,
                        color: formConfig.activeButtonColor,
                      }}
                    >
                      MLBB
                    </span>
                  </div>
                  <p className="text-[10px] text-[#9C948A] truncate">
                    {formConfig.slogan || 'Sistem Papan Klasemen Season & Tracker Medali'}
                  </p>
                </div>
              </div>

              {/* Sample simulated button on right */}
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-1 rounded-lg border border-[#332C25] bg-[#241F1B] text-[#9C948A] hidden sm:inline">
                  Admin
                </span>
              </div>
            </div>

            {/* Simulated Navigation Bar Row */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5 overflow-hidden">
              <div
                className="px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm flex items-center gap-1 transition-colors"
                style={{
                  backgroundColor: formConfig.activeButtonColor,
                  color: formConfig.activeButtonTextColor,
                }}
              >
                <span>🏆 Dashboard (Aktif)</span>
              </div>
              <div className="px-2 py-1 rounded-lg text-[11px] font-medium text-[#9C948A] bg-[#241F1B]/80 border border-transparent">
                <span>Riwayat</span>
              </div>
              <div className="px-2 py-1 rounded-lg text-[11px] font-medium text-[#9C948A] bg-[#241F1B]/80 border border-transparent">
                <span>Klasemen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#332C25] bg-[#241F1B]/40 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('brand')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'brand'
                ? 'border-[#E8B33D] text-[#E8B33D]'
                : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <Type size={14} />
            <span>1. Brand & Logo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'colors'
                ? 'border-[#E8B33D] text-[#E8B33D]'
                : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <Palette size={14} />
            <span>2. Palet Warna</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'background'
                ? 'border-[#E8B33D] text-[#E8B33D]'
                : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <ImageIcon size={14} />
            <span>3. Background</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: BRAND & LOGO */}
          {activeTab === 'brand' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Logo Settings */}
              <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#E8B33D]" />
                    <span>Format & Tampilan Logo Header</span>
                  </label>
                  <div className="flex items-center gap-1 bg-[#161311] p-0.5 rounded-lg border border-[#332C25]">
                    <button
                      type="button"
                      onClick={() => setFormConfig((prev) => ({ ...prev, logoType: 'text' }))}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        formConfig.logoType === 'text'
                          ? 'bg-[#E8B33D] text-[#161311]'
                          : 'text-[#9C948A] hover:text-[#F2EDE4]'
                      }`}
                    >
                      Inisial / Teks
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormConfig((prev) => ({ ...prev, logoType: 'image' }))}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        formConfig.logoType === 'image'
                          ? 'bg-[#E8B33D] text-[#161311]'
                          : 'text-[#9C948A] hover:text-[#F2EDE4]'
                      }`}
                    >
                      Gambar / Foto
                    </button>
                  </div>
                </div>

                {formConfig.logoType === 'text' ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-[#9C948A]">
                      Huruf Inisial Logo (1-4 Karakter):
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        maxLength={4}
                        value={formConfig.logoText}
                        onChange={(e) =>
                          setFormConfig((prev) => ({ ...prev, logoText: e.target.value.toUpperCase() }))
                        }
                        placeholder="Contoh: LP, FR, ML"
                        className="w-28 rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-sm font-bold text-center uppercase text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                      />
                      <span className="text-[11px] text-[#9C948A]">
                        Ditampilkan dengan warna tema aktif di sudut kiri atas.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#332C25] hover:border-[#E8B33D] bg-[#161311] hover:bg-[#201C18] p-2.5 text-xs font-bold text-[#F2EDE4] transition-all cursor-pointer"
                      >
                        <Upload size={14} className="text-[#E8B33D]" />
                        <span>Pilih Gambar Logo dari Perangkat</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-[#9C948A]">
                        Atau Masukkan URL Gambar Logo:
                      </label>
                      <input
                        type="url"
                        value={formConfig.logoUrl}
                        onChange={(e) =>
                          setFormConfig((prev) => ({ ...prev, logoUrl: e.target.value.trim() }))
                        }
                        placeholder="https://.../logo.png"
                        className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2 text-xs text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                      />
                    </div>

                    {/* Ukuran Logo (Logo Size) */}
                    <div className="space-y-2 rounded-xl border border-[#332C25] bg-[#161311] p-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5">
                          <Sliders size={13} className="text-[#E8B33D]" />
                          <span>Ukuran Logo Header</span>
                        </label>
                        <span className="rounded-md bg-[#241F1B] px-2 py-0.5 text-xs font-black text-[#E8B33D] border border-[#332C25]">
                          {formConfig.logoSize || 52}px
                        </span>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {[
                          { label: 'Kecil', size: 40 },
                          { label: 'Standar', size: 48 },
                          { label: 'Sedang', size: 54 },
                          { label: 'Besar', size: 62 },
                          { label: 'Ekstra', size: 72 },
                        ].map((preset) => {
                          const isSelected = (formConfig.logoSize || 52) === preset.size;
                          return (
                            <button
                              key={preset.size}
                              type="button"
                              onClick={() => setFormConfig((prev) => ({ ...prev, logoSize: preset.size }))}
                              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#E8B33D] bg-[#E8B33D]/20 text-[#E8B33D] font-black'
                                  : 'border-[#332C25] bg-[#201C18] text-[#9C948A] hover:text-[#F2EDE4] hover:border-[#4D4238]'
                              }`}
                            >
                              <span className="text-[10px] font-bold leading-tight">{preset.label}</span>
                              <span className="text-[9px] text-[#9C948A]">{preset.size}px</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Slider for smooth custom size */}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] text-[#9C948A]">32px</span>
                        <input
                          type="range"
                          min={32}
                          max={80}
                          step={2}
                          value={formConfig.logoSize || 52}
                          onChange={(e) =>
                            setFormConfig((prev) => ({ ...prev, logoSize: Number(e.target.value) }))
                          }
                          className="flex-1 accent-[#E8B33D] cursor-pointer h-1.5 bg-[#2A241E] rounded-lg"
                        />
                        <span className="text-[10px] text-[#9C948A]">80px</span>
                      </div>
                      <p className="text-[10px] text-[#9C948A]">
                        Sesuaikan tinggi logo agar teks lambang/crest tampak tajam, jelas, dan tidak pecah.
                      </p>
                    </div>

                    {/* Proporsi & Ketajaman Logo (Object Fit) */}
                    <div className="space-y-1.5 rounded-xl border border-[#332C25] bg-[#161311] p-3">
                      <label className="text-xs font-bold text-[#F2EDE4]">
                        Kesesuaian Rasio & Ketajaman (Fit):
                      </label>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setFormConfig((prev) => ({ ...prev, logoFit: 'contain' }))}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            (formConfig.logoFit || 'contain') === 'contain'
                              ? 'border-[#E8B33D] bg-[#E8B33D]/15 text-[#F2EDE4]'
                              : 'border-[#332C25] bg-[#201C18] text-[#9C948A] hover:text-[#F2EDE4]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Proporsional (Contain)</span>
                            {(formConfig.logoFit || 'contain') === 'contain' && (
                              <Check size={13} className="text-[#E8B33D]" />
                            )}
                          </div>
                          <p className="text-[10px] text-[#9C948A] mt-0.5 leading-snug">
                            Rasio asli tetap utuh, detail lambang & teks tajam, tidak gepeng.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormConfig((prev) => ({ ...prev, logoFit: 'cover' }))}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            formConfig.logoFit === 'cover'
                              ? 'border-[#E8B33D] bg-[#E8B33D]/15 text-[#F2EDE4]'
                              : 'border-[#332C25] bg-[#201C18] text-[#9C948A] hover:text-[#F2EDE4]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Mengisi Kotak (Cover)</span>
                            {formConfig.logoFit === 'cover' && (
                              <Check size={13} className="text-[#E8B33D]" />
                            )}
                          </div>
                          <p className="text-[10px] text-[#9C948A] mt-0.5 leading-snug">
                            Mengisi penuh bingkai (dapat terpotong jika bukan rasio 1:1).
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Bentuk Bingkai Logo (Frame Shape) */}
                    <div className="space-y-1.5 rounded-xl border border-[#332C25] bg-[#161311] p-3">
                      <label className="text-xs font-bold text-[#F2EDE4]">
                        Bentuk Bingkai Logo:
                      </label>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {[
                          { id: 'rounded', label: 'Kotak Rounded', desc: 'Sudut melengkung halus' },
                          { id: 'circle', label: 'Lingkaran', desc: 'Bingkai bulat' },
                          { id: 'none', label: 'Transparan', desc: 'Tanpa box / menyatu alami' },
                        ].map((shape) => {
                          const isSelected = (formConfig.logoShape || 'rounded') === shape.id;
                          return (
                            <button
                              key={shape.id}
                              type="button"
                              onClick={() =>
                                setFormConfig((prev) => ({
                                  ...prev,
                                  logoShape: shape.id as 'rounded' | 'circle' | 'none',
                                }))
                              }
                              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#E8B33D] bg-[#E8B33D]/15 text-[#F2EDE4]'
                                  : 'border-[#332C25] bg-[#201C18] text-[#9C948A] hover:text-[#F2EDE4]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{shape.label}</span>
                                {isSelected && <Check size={13} className="text-[#E8B33D]" />}
                              </div>
                              <p className="text-[9px] text-[#9C948A] mt-0.5">{shape.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nama Logo (Brand Name / Header Title) */}
              <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/60 p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-[#F2EDE4]">
                  Nama Logo / Judul Header:
                </label>
                <input
                  type="text"
                  value={formConfig.brandName}
                  onChange={(e) =>
                    setFormConfig((prev) => ({ ...prev, brandName: e.target.value }))
                  }
                  placeholder="Contoh: FRATERNITE- LAGA AMAL"
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2 text-sm font-bold text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                />
                <p className="text-[11px] text-[#9C948A]">
                  Teks nama utama yang tampil mencolok di samping logo header.
                </p>
              </div>

              {/* Slogan */}
              <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/60 p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-[#F2EDE4]">
                  Slogan / Sub-Judul:
                </label>
                <input
                  type="text"
                  value={formConfig.slogan}
                  onChange={(e) =>
                    setFormConfig((prev) => ({ ...prev, slogan: e.target.value }))
                  }
                  placeholder="Contoh: Sistem Papan Klasemen Season & Tracker Medali Komunitas Pantos"
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2 text-xs text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                />
                <p className="text-[11px] text-[#9C948A]">
                  Deskripsi ringkas yang tampil di bawah nama logo pada layar laptop/desktop.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PALET WARNA (HEADER & ACTIVE BUTTON) */}
          {activeTab === 'colors' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* 1. Header Background Color Palette */}
              <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5">
                    <Palette size={14} className="text-[#E8B33D]" />
                    <span>Palet Warna Header:</span>
                  </label>
                  <span className="text-[11px] font-mono text-[#9C948A] bg-[#161311] px-2 py-0.5 rounded border border-[#332C25]">
                    {formConfig.headerBgColor}
                  </span>
                </div>

                {/* Header Presets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {HEADER_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      formConfig.headerBgColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() =>
                          setFormConfig((prev) => ({ ...prev, headerBgColor: preset.hex }))
                        }
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#E8B33D] bg-[#161311] ring-1 ring-[#E8B33D]'
                            : 'border-[#332C25] bg-[#161311]/80 hover:bg-[#201C18] hover:border-[#443B33]'
                        }`}
                      >
                        <div
                          className="h-6 w-6 rounded-lg border border-white/20 shrink-0 shadow-sm"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#F2EDE4] truncate leading-tight">
                            {preset.name}
                          </p>
                          <p className="text-[9px] text-[#9C948A] truncate">{preset.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#9C948A]">Pilih Warna Kustom:</span>
                  <input
                    type="color"
                    value={formConfig.headerBgColor}
                    onChange={(e) =>
                      setFormConfig((prev) => ({ ...prev, headerBgColor: e.target.value }))
                    }
                    className="h-8 w-10 rounded cursor-pointer border border-[#332C25] bg-transparent"
                  />
                  <input
                    type="text"
                    value={formConfig.headerBgColor}
                    onChange={(e) =>
                      setFormConfig((prev) => ({ ...prev, headerBgColor: e.target.value }))
                    }
                    className="w-24 rounded-lg border border-[#332C25] bg-[#161311] px-2.5 py-1 text-xs font-mono text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Active Button Color Palette */}
              <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#E8B33D]" />
                    <span>Warna Active Button & Aksen Navigasi:</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-4 w-4 rounded-full border border-white/20"
                      style={{ backgroundColor: formConfig.activeButtonColor }}
                    />
                    <span className="text-[11px] font-mono text-[#9C948A] bg-[#161311] px-2 py-0.5 rounded border border-[#332C25]">
                      {formConfig.activeButtonColor}
                    </span>
                  </div>
                </div>

                {/* Active Button Presets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACTIVE_BUTTON_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      formConfig.activeButtonColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() =>
                          setFormConfig((prev) => ({
                            ...prev,
                            activeButtonColor: preset.hex,
                            activeButtonTextColor: preset.textHex,
                          }))
                        }
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#E8B33D] bg-[#161311] ring-1 ring-[#E8B33D]'
                            : 'border-[#332C25] bg-[#161311]/80 hover:bg-[#201C18] hover:border-[#443B33]'
                        }`}
                      >
                        <div
                          className="h-6 w-6 rounded-lg border border-white/20 shrink-0 shadow-sm flex items-center justify-center font-bold text-[10px]"
                          style={{
                            backgroundColor: preset.hex,
                            color: preset.textHex,
                          }}
                        >
                          ✓
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#F2EDE4] truncate leading-tight">
                            {preset.name}
                          </p>
                          <p className="text-[9px] font-mono text-[#9C948A]">{preset.hex}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input for Button */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#9C948A]">Warna Tombol Kustom:</span>
                  <input
                    type="color"
                    value={formConfig.activeButtonColor}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setFormConfig((prev) => ({
                        ...prev,
                        activeButtonColor: newColor,
                        activeButtonTextColor: getContrastTextColor(newColor),
                      }));
                    }}
                    className="h-8 w-10 rounded cursor-pointer border border-[#332C25] bg-transparent"
                  />
                  <input
                    type="text"
                    value={formConfig.activeButtonColor}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setFormConfig((prev) => ({
                        ...prev,
                        activeButtonColor: newColor,
                        activeButtonTextColor: getContrastTextColor(newColor),
                      }));
                    }}
                    className="w-24 rounded-lg border border-[#332C25] bg-[#161311] px-2.5 py-1 text-xs font-mono text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND & OPACITY */}
          {activeTab === 'background' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Preview Box */}
              <div className="relative h-40 w-full rounded-xl border border-[#332C25] overflow-hidden bg-[#161311] flex items-center justify-center">
                {formConfig.bgUrl ? (
                  <>
                    <img
                      src={formConfig.bgUrl}
                      alt="Background Preview"
                      className="h-full w-full object-cover transition-opacity duration-200"
                      style={{ opacity: formConfig.bgOpacity / 100 }}
                      onError={() => {
                        setErrorStatus(
                          'Tautan gambar background tidak dapat dimuat langsung. Anda dapat mengunggah file bacground.png secara langsung melalui tombol di bawah.'
                        );
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161311]/80 via-transparent to-black/20 pointer-events-none" />
                    <span className="absolute bottom-2 left-3 text-[11px] font-bold text-[#E8B33D] bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
                      Pratinjau: Opacity {formConfig.bgOpacity}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-[#9C948A]">Tidak ada background terpilih</span>
                )}
              </div>

              {/* Opacity Adjustment Slider */}
              <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5">
                    <Sliders size={14} className="text-[#E8B33D]" />
                    <span>Tingkat Keterangan / Opacity Background</span>
                  </label>
                  <span className="text-xs font-black text-[#E8B33D] bg-[#161311] px-2 py-0.5 rounded border border-[#332C25]">
                    {formConfig.bgOpacity}%
                  </span>
                </div>

                <input
                  type="range"
                  min="20"
                  max="95"
                  step="5"
                  value={formConfig.bgOpacity}
                  onChange={(e) =>
                    setFormConfig((prev) => ({ ...prev, bgOpacity: Number(e.target.value) }))
                  }
                  className="w-full h-1.5 bg-[#161311] rounded-lg appearance-none cursor-pointer accent-[#E8B33D]"
                />

                {/* Quick Presets */}
                <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                  <span className="text-[#9C948A]">Pilihan Cepat:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: 'Redup', val: 35 },
                      { label: 'Sedang', val: 55 },
                      { label: 'Terang', val: 70 },
                      { label: 'Vibrant', val: 85 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setFormConfig((prev) => ({ ...prev, bgOpacity: preset.val }))
                        }
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                          formConfig.bgOpacity === preset.val
                            ? 'border-[#E8B33D] bg-[#E8B33D] text-[#161311]'
                            : 'border-[#332C25] bg-[#161311] text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                        }`}
                      >
                        {preset.label} ({preset.val}%)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* GitHub Source Note & Reset */}
              <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F2EDE4]">
                    Tautan Sumber Git Resmi:
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToGitBg}
                    className="inline-flex items-center gap-1 text-[11px] text-[#E8B33D] hover:underline cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    Set Default Git
                  </button>
                </div>
                <p className="text-[10px] font-mono text-[#9C948A] break-all bg-[#161311] p-2 rounded border border-[#332C25]">
                  {DEFAULT_GIT_BACKGROUND_URL}
                </p>
              </div>

              {/* Direct File Upload Option */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#9C948A]">
                  Upload File bacground.png dari Komputer:
                </label>
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#332C25] hover:border-[#E8B33D] bg-[#241F1B] hover:bg-[#2A241E] p-3 text-xs font-bold text-[#F2EDE4] transition-all cursor-pointer"
                >
                  <Upload size={14} className="text-[#E8B33D]" />
                  <span>Unggah Foto Background (File PNG/JPG)</span>
                </button>
              </div>

              {/* Custom URL Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#9C948A]">
                  Atau Gunakan URL Gambar Lain:
                </label>
                <input
                  type="url"
                  value={formConfig.bgUrl}
                  onChange={(e) =>
                    setFormConfig((prev) => ({ ...prev, bgUrl: e.target.value.trim() }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-xs text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorStatus && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
              <AlertCircle size={15} className="shrink-0 text-amber-400 mt-0.5" />
              <span>{errorStatus}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#332C25] px-5 py-3.5 bg-[#241F1B]/70 shrink-0">
          <button
            type="button"
            onClick={handleResetAllDefaults}
            className="inline-flex items-center gap-1.5 text-xs text-[#9C948A] hover:text-[#F2EDE4] transition-colors cursor-pointer"
            title="Reset ke pengaturan tema awal"
          >
            <RotateCcw size={13} />
            <span>Reset Awal</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#332C25] bg-[#241F1B] px-4 py-2 text-xs font-bold text-[#9C948A] hover:text-[#F2EDE4] transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black transition-all cursor-pointer shadow-md"
              style={{
                backgroundColor: formConfig.activeButtonColor,
                color: formConfig.activeButtonTextColor,
              }}
            >
              <Check size={14} />
              <span>Terapkan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
