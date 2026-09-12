import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Upload, Check, RotateCcw, AlertCircle } from 'lucide-react';

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBgUrl: string;
  currentOpacity?: number;
  onSaveBgUrl: (url: string) => void;
  onSaveOpacity?: (opacity: number) => void;
}

export const DEFAULT_GIT_BACKGROUND_URL =
  'https://raw.githubusercontent.com/rizkynugrahap/kampang/main/src/data/bacground.png';

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  isOpen,
  onClose,
  currentBgUrl,
  currentOpacity = 60,
  onSaveBgUrl,
  onSaveOpacity,
}) => {
  const [urlInput, setUrlInput] = useState<string>(currentBgUrl || DEFAULT_GIT_BACKGROUND_URL);
  const [previewUrl, setPreviewUrl] = useState<string>(currentBgUrl || DEFAULT_GIT_BACKGROUND_URL);
  const [opacityVal, setOpacityVal] = useState<number>(currentOpacity);
  const [errorStatus, setErrorStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local file upload (e.g. if the Git repo is private)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setPreviewUrl(dataUrl);
        setUrlInput(dataUrl);
        setErrorStatus('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) {
      setErrorStatus('URL background tidak boleh kosong.');
      return;
    }
    setPreviewUrl(urlInput.trim());
    setErrorStatus('');
  };

  const handleResetToGit = () => {
    setUrlInput(DEFAULT_GIT_BACKGROUND_URL);
    setPreviewUrl(DEFAULT_GIT_BACKGROUND_URL);
    setErrorStatus('');
  };

  const handleSave = () => {
    onSaveBgUrl(previewUrl);
    if (onSaveOpacity) {
      onSaveOpacity(opacityVal);
    }
    onClose();
  };

  return (
    <div
      id="bg-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        id="bg-settings-modal-card"
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
                Pengaturan Background Laga Amal
              </h3>
              <p className="text-xs text-[#9C948A]">
                Foto background tema Pantos E-Sport & Tingkat Keterangan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Preview Box */}
          <div className="relative h-44 w-full rounded-xl border border-[#332C25] overflow-hidden bg-[#161311] flex items-center justify-center">
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Background Preview"
                  className="h-full w-full object-cover transition-opacity duration-200"
                  style={{ opacity: opacityVal / 100 }}
                  onError={() => {
                    setErrorStatus(
                      'Tautan gambar tidak dapat diakses langsung atau repositori Git bersifat Privat. Anda dapat mengunggah file bacground.png secara langsung melalui tombol di bawah.'
                    );
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#161311]/80 via-transparent to-black/20 pointer-events-none" />
                <span className="absolute bottom-2 left-3 text-[11px] font-bold text-[#E8B33D] bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
                  Pratinjau: Opacity {opacityVal}%
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
                <span>Tingkat Keterangan / Opacity Background</span>
              </label>
              <span className="text-xs font-black text-[#E8B33D] bg-[#161311] px-2 py-0.5 rounded border border-[#332C25]">
                {opacityVal}%
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="95"
              step="5"
              value={opacityVal}
              onChange={(e) => setOpacityVal(Number(e.target.value))}
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
                    onClick={() => setOpacityVal(preset.val)}
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                      opacityVal === preset.val
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

          {/* GitHub Source Note */}
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B]/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F2EDE4]">
                Tautan Sumber Git (Requested):
              </span>
              <button
                onClick={handleResetToGit}
                className="inline-flex items-center gap-1 text-[11px] text-[#E8B33D] hover:underline cursor-pointer"
              >
                <RotateCcw size={11} />
                Set Default Git
              </button>
            </div>
            <p className="text-[11px] font-mono text-[#9C948A] break-all bg-[#161311] p-2 rounded border border-[#332C25]">
              {DEFAULT_GIT_BACKGROUND_URL}
            </p>
          </div>

          {/* Direct File Upload Option */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#9C948A]">
              Pilihan: Upload File bacground.png Langsung (Jika Git Masih Privat):
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#332C25] hover:border-[#E8B33D] bg-[#241F1B] hover:bg-[#2A241E] p-3 text-xs font-bold text-[#F2EDE4] transition-all cursor-pointer"
            >
              <Upload size={14} className="text-[#E8B33D]" />
              <span>Unggah Foto bacground.png dari Komputer</span>
            </button>
          </div>

          {/* Custom URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#9C948A]">
              Atau Gunakan URL Gambar Lain:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-xs text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
              />
              <button
                onClick={handleApplyUrl}
                className="rounded-xl bg-[#332C25] hover:bg-[#3D352E] px-4 py-2 text-xs font-bold text-[#F2EDE4] transition-colors cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>

          {/* Error / Warning Notice */}
          {errorStatus && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
              <AlertCircle size={15} className="shrink-0 text-amber-400 mt-0.5" />
              <span>{errorStatus}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#332C25] px-6 py-4 bg-[#241F1B]/60">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#332C25] bg-[#241F1B] px-4 py-2 text-xs font-bold text-[#9C948A] hover:text-[#F2EDE4] transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-[#E8B33D] px-5 py-2 text-xs font-black text-[#161311] hover:bg-[#F2C04D] transition-colors cursor-pointer shadow-md"
          >
            <Check size={14} />
            <span>Terapkan Background</span>
          </button>
        </div>
      </div>
    </div>
  );
};
