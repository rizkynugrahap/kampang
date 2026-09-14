import React, { useEffect } from 'react';
import { X, ExternalLink, Camera, Sparkles, ZoomIn } from 'lucide-react';
import { normalizeImageUrl } from '../data/playerAvatars';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  playerName: string;
  tier?: string;
  status?: string;
  julukan?: string;
  onEditPhoto?: () => void;
  isAdmin?: boolean;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  playerName,
  tier,
  status,
  julukan,
  onEditPhoto,
  isAdmin = false,
}) => {
  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanUrl = normalizeImageUrl(imageUrl);
  const initials = (playerName || 'PL')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      id="image-preview-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="image-preview-modal-card"
        className="relative w-full max-w-lg rounded-2xl border border-[#332C25] bg-[#1A1614] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-image-preview"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-[#241F1B] border border-[#332C25] p-2 text-[#9C948A] hover:text-[#F2EDE4] hover:border-[#E8B33D]/60 transition-all cursor-pointer shadow-lg"
          aria-label="Tutup Preview"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-10">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#E8B33D] uppercase tracking-wider">
              <ZoomIn size={13} /> Preview Foto Profil
            </span>
          </div>
          <h3 className="text-xl font-black text-[#F2EDE4] tracking-tight mt-0.5">
            {playerName}
          </h3>
        </div>

        {/* Image Display Area */}
        <div className="relative mx-auto flex items-center justify-center rounded-2xl bg-[#14110F] border-2 border-[#E8B33D]/40 p-2 shadow-[0_0_35px_rgba(232,179,61,0.15)] overflow-hidden">
          {cleanUrl ? (
            <img
              src={cleanUrl}
              alt={`Foto Profil ${playerName}`}
              referrerPolicy="no-referrer"
              className="max-h-[340px] sm:max-h-[400px] w-full object-contain rounded-xl select-none"
            />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-[#241F1B] text-5xl font-black text-[#E8B33D]">
              {initials}
            </div>
          )}
        </div>

        {/* Player Metadata Pill Summary */}
        <div className="mt-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#332C25] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {tier && (
                <span className="rounded-lg bg-[#241F1B] border border-[#332C25] px-2.5 py-1 text-xs font-bold text-[#E8B33D]">
                  Tier {tier}
                </span>
              )}
              {status && (
                <span className="rounded-lg bg-[#241F1B] border border-[#332C25] px-2.5 py-1 text-xs font-medium text-[#9C948A]">
                  Status: <strong className="text-[#F2EDE4]">{status}</strong>
                </span>
              )}
            </div>

            {/* External View Link */}
            {cleanUrl && (
              <a
                href={cleanUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#E8B33D] hover:underline"
              >
                <span>Buka Gambar Penuh</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Julukan */}
          {julukan && (
            <div className="rounded-xl border border-[#332C25]/70 bg-[#241F1B]/60 px-3.5 py-2">
              <span className="text-[11px] text-[#9C948A] block">Julukan Resmi Pantos:</span>
              <p className="text-xs font-bold text-[#F2EDE4] italic mt-0.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#E8B33D] shrink-0" />
                <span>"{julukan}"</span>
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-[#332C25] pt-4">
          {isAdmin && onEditPhoto && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditPhoto();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8B33D]/50 bg-[#E8B33D]/10 hover:bg-[#E8B33D]/25 px-4 py-2 text-xs font-bold text-[#E8B33D] transition-colors cursor-pointer"
            >
              <Camera size={14} />
              <span>Ganti Foto</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#241F1B] hover:bg-[#2F2823] px-5 py-2 text-xs font-bold text-[#F2EDE4] transition-colors cursor-pointer border border-[#332C25]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
