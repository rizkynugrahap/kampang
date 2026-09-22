import React, { useEffect } from 'react';
import { Bell, X, ArrowRight, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types';

interface MentionNotificationToastProps {
  notification: {
    message: ChatMessage;
    senderName: string;
    senderAvatar?: string;
    senderTier?: string;
  } | null;
  onClose: () => void;
  onOpenChat: (messageId: string) => void;
}

export const MentionNotificationToast: React.FC<MentionNotificationToastProps> = ({
  notification,
  onClose,
  onOpenChat,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const { message, senderName, senderAvatar, senderTier } = notification;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-[#1C1714] border-2 border-[#E8B33D] p-3.5 shadow-2xl backdrop-blur-xl shadow-black/80">
        {/* Glowing top line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E8B33D] via-[#F3C256] to-[#E8B33D]" />

        <div className="flex items-start gap-3">
          {/* Avatar / Bell icon */}
          <div className="relative shrink-0 mt-0.5">
            {senderAvatar ? (
              <img
                src={senderAvatar}
                alt={senderName}
                className="h-10 w-10 rounded-xl object-cover border border-[#E8B33D]/50 shadow-md"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2D241C] border border-[#E8B33D]/40 text-[#E8B33D] font-bold text-sm shadow-md">
                {senderName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E8B33D] text-[#161311] shadow-md ring-2 ring-[#1C1714]">
              <Bell size={11} className="animate-bounce" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-[#F2EDE4] truncate">
                {senderName}
              </span>
              {senderTier && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2D241C] text-[#E8B33D] font-semibold border border-[#E8B33D]/30">
                  {senderTier}
                </span>
              )}
              <span className="text-[11px] text-[#E8B33D] font-medium">
                menyebut Anda!
              </span>
            </div>

            <p className="mt-1 text-xs text-[#C7BEB3] line-clamp-2 leading-relaxed bg-[#161311]/60 px-2.5 py-1.5 rounded-lg border border-[#332C25]/60 font-mono text-[11px]">
              {message.content}
            </p>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#8C8377] flex items-center gap-1">
                <MessageSquare size={10} />
                Lobby Chat
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenChat(message.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] transition-all active:scale-95 shadow cursor-pointer"
              >
                <span>Buka Chat</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-lg text-[#8C8377] hover:text-[#F2EDE4] hover:bg-[#2D241C] transition-colors cursor-pointer"
            title="Tutup Notifikasi"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
