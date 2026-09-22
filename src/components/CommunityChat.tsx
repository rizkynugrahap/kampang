import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Pin,
  Trash2,
  Smile,
  Shield,
  KeyRound,
  Trophy,
  Swords,
  Sparkles,
  AtSign,
  ChevronDown,
  Lock,
  Clock,
  Flame,
  Laugh,
  Crown,
  Reply,
  X,
  ExternalLink,
  ZoomIn,
  UserRound,
} from 'lucide-react';
import { Player, Match, ChatMessage, ChatReaction, LagaAmalSeasonData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { usePlayerAuth } from '../contexts/PlayerAuthContext';
import { PlayerAccountMenu } from './PlayerAccountMenu';
import { ImagePreviewModal } from './ImagePreviewModal';
import { getPlayerAvatarUrl } from '../constants/playerAvatars';
import {
  subscribeToChatMessages,
  sendChatMessage,
  toggleEmojiReaction,
  pinChatMessage,
  deleteChatMessage,
} from '../services/chatService';

interface CommunityChatProps {
  players: Player[];
  isAdmin?: boolean;
  onOpenMatchDetail?: (matchId: string | number) => void;
  onViewPlayerProfile?: (nicknameOrId: string | number) => void;
  activeSeason?: LagaAmalSeasonData;
  className?: string;
}

const QUICK_EMOJIS = ['🔥', '😂', '👑', '💀', '🗿', '🤡', '🍷', '🤫', '🥶', '👏', '❤️', '🍫'];

interface MemeEmoticonItem {
  label: string;
  value: string;
  category: 'meme' | 'emoji' | 'gaming';
}

const MEME_EMOTICONS: MemeEmoticonItem[] = [
  // Trending memes
  { label: '🗿 Mewing Chad', value: '🗿', category: 'meme' },
  { label: '🍷🗿 Sigma', value: '🍷🗿', category: 'meme' },
  { label: '💀 Kena Mental', value: '💀', category: 'meme' },
  { label: '🤡 Badut Lord', value: '🤡', category: 'meme' },
  { label: '🤫🧏‍♂️ Bye Bye', value: '🤫🧏‍♂️', category: 'meme' },
  { label: '🦅 Gak Bahaya Ta?', value: '🦅', category: 'meme' },
  { label: '🥶 Dingin Banget', value: '🥶', category: 'meme' },
  { label: '🐒 Monke Beban', value: '🐒', category: 'meme' },
  { label: '😭 Nangis Dipojokan', value: '😭', category: 'meme' },
  { label: '🫡 Siap Komandan', value: '🫡', category: 'meme' },
  { label: '🍗 Winner Chicken', value: '🍗', category: 'meme' },
  { label: '🍫 Coklat Moment', value: '🍫', category: 'meme' },
  { label: '👑 Gendong Tim', value: '👑', category: 'meme' },
  { label: '🥱 Ez Game Dek', value: '🥱', category: 'meme' },
  { label: '👏 GGWP King', value: '👏', category: 'meme' },
  { label: '👀 Liat Aja Dulu', value: '👀', category: 'meme' },
  { label: '🔥 Menyala Abangkuh', value: '🔥', category: 'meme' },
  { label: '🚀 Meluncur Cepat', value: '🚀', category: 'meme' },
  // Classic Expressions
  { label: 'Tertawa', value: '😂', category: 'emoji' },
  { label: 'Ngakak', value: '🤣', category: 'emoji' },
  { label: 'Keren', value: '😎', category: 'emoji' },
  { label: 'Love', value: '😍', category: 'emoji' },
  { label: 'Star Eyes', value: '🤩', category: 'emoji' },
  { label: 'Party', value: '🥳', category: 'emoji' },
  { label: 'Smirk', value: '😏', category: 'emoji' },
  { label: 'Mikir', value: '🤔', category: 'emoji' },
  { label: 'Kaget', value: '😱', category: 'emoji' },
  { label: 'Marah', value: '😡', category: 'emoji' },
  { label: 'Toxic', value: '🤬', category: 'emoji' },
  { label: 'Turu', value: '😴', category: 'emoji' },
  { label: 'Muntah', value: '🤮', category: 'emoji' },
  { label: 'Malaikat', value: '😇', category: 'emoji' },
  { label: 'Iblis', value: '😈', category: 'emoji' },
  { label: 'Hantu', value: '👻', category: 'emoji' },
  { label: 'Poop', value: '💩', category: 'emoji' },
  { label: 'Love Heart', value: '❤️', category: 'emoji' },
  // Gaming & Gestures
  { label: 'Jempol', value: '👍', category: 'gaming' },
  { label: 'Dislike', value: '👎', category: 'gaming' },
  { label: 'Tinju', value: '👊', category: 'gaming' },
  { label: 'Peace', value: '✌️', category: 'gaming' },
  { label: 'Salaman', value: '🤝', category: 'gaming' },
  { label: 'Tepuk Tangan', value: '👏', category: 'gaming' },
  { label: 'Sungkem', value: '🙏', category: 'gaming' },
  { label: 'Otot Kuat', value: '💪', category: 'gaming' },
  { label: 'Pedang By 1', value: '⚔️', category: 'gaming' },
  { label: 'Perisai Tank', value: '🛡️', category: 'gaming' },
  { label: 'Panah Marksman', value: '🏹', category: 'gaming' },
  { label: 'Tongkat Mage', value: '🪄', category: 'gaming' },
  { label: 'Mahkota MVP', value: '👑', category: 'gaming' },
  { label: 'Medali Antam', value: '🥇', category: 'gaming' },
  { label: 'Medali Silver', value: '🥈', category: 'gaming' },
  { label: 'Medali Coklat', value: '🍫', category: 'gaming' },
  { label: 'Piala Juara', value: '🏆', category: 'gaming' },
  { label: 'Api Semangat', value: '🔥', category: 'gaming' },
  { label: 'Ledakan', value: '💥', category: 'gaming' },
  { label: 'Bintang', value: '✨', category: 'gaming' },
  { label: 'Target Sasaran', value: '🎯', category: 'gaming' },
];

export const CommunityChat: React.FC<CommunityChatProps> = ({
  players,
  isAdmin = false,
  onOpenMatchDetail,
  onViewPlayerProfile,
  activeSeason,
  className = '',
}) => {
  const { session, isLoggedIn, openLogin } = usePlayerAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  // Modals & UI States
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [isInputEmojiPickerOpen, setIsInputEmojiPickerOpen] = useState(false);
  const [emojiCategoryTab, setEmojiCategoryTab] = useState<'meme' | 'emoji' | 'gaming'>('meme');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Floating Player Profile & Zoom Modal States
  const [floatingPlayerName, setFloatingPlayerName] = useState<string | null>(null);
  const [zoomedImagePlayer, setZoomedImagePlayer] = useState<{
    name: string;
    url: string;
    tier?: string;
    status?: string;
    julukan?: string;
  } | null>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);
  const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsub = subscribeToChatMessages((fetchedMessages) => {
      setMessages(fetchedMessages);
    });
    return () => unsub();
  }, []);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!isInputEmojiPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsInputEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInputEmojiPickerOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Handle scroll to detect if user scrolled away from bottom
  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    setShouldAutoScroll(isAtBottom);
  };

  // Find pinned message
  const pinnedMessage = useMemo(() => {
    const pinned = messages.filter((m) => m.isPinned);
    return pinned.length > 0 ? pinned[pinned.length - 1] : null;
  }, [messages]);

  // Mention autocomplete candidates
  const filteredMentionPlayers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return players
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, players]);

  // Floating player detail
  const floatingPlayer = useMemo(() => {
    if (!floatingPlayerName) return null;
    const found = players.find(
      (p) => p.name.trim().toLowerCase() === floatingPlayerName.trim().toLowerCase()
    );
    if (found) return found;
    return {
      id: 0,
      name: floatingPlayerName,
      avatar_url: getPlayerAvatarUrl(floatingPlayerName),
      tier: 'Peserta',
      status: 'Aktif' as const,
      medals: { MVP: 0, Gold: 0, Silver: 0, Coklat: 0 },
      winRate: 0,
      total_match: 0,
      score: 0,
    };
  }, [floatingPlayerName, players]);

  // Floating player's active season stats & rank
  const floatingPlayerSeasonStat = useMemo(() => {
    if (!floatingPlayer || !activeSeason?.players) return null;
    return activeSeason.players.find(
      (p) => p.nickname.trim().toLowerCase() === floatingPlayer.name.trim().toLowerCase()
    );
  }, [floatingPlayer, activeSeason]);

  const floatingPlayerSeasonRank = useMemo(() => {
    if (!floatingPlayer || !activeSeason?.players || activeSeason.players.length === 0) return 0;
    const sorted = [...activeSeason.players].sort((a, b) => {
      const scoreA = Number(a.score) || 0;
      const scoreB = Number(b.score) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const mvpA = Number(a.mvp) || 0;
      const mvpB = Number(b.mvp) || 0;
      if (mvpB !== mvpA) return mvpB - mvpA;
      const coklatA = Number(a.coklat) || 0;
      const coklatB = Number(b.coklat) || 0;
      if (coklatA !== coklatB) return coklatA - coklatB;
      return (Number(b.winRate) || 0) - (Number(a.winRate) || 0);
    });
    const idx = sorted.findIndex(
      (p) => p.nickname.trim().toLowerCase() === floatingPlayer.name.trim().toLowerCase()
    );
    return idx >= 0 ? idx + 1 : 0;
  }, [floatingPlayer, activeSeason]);

  // Handle clicking avatar in chat:
  // 1st click: shows floating profile
  // 2nd click (or clicking photo in floating profile): enlarges the photo
  const handleAvatarClick = (
    playerName: string,
    playerAvatar?: string,
    playerTier?: string,
    playerJulukan?: string
  ) => {
    if (floatingPlayerName && floatingPlayerName.trim().toLowerCase() === playerName.trim().toLowerCase()) {
      setZoomedImagePlayer({
        name: playerName,
        url: playerAvatar || getPlayerAvatarUrl(playerName),
        tier: playerTier,
        julukan: playerJulukan,
      });
      return;
    }
    setFloatingPlayerName(playerName);
  };

  // Reply handlers
  const handleStartReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`chat-msg-${msgId}`) || document.getElementById(`chat-system-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#E8B33D]', 'ring-offset-2', 'ring-offset-[#161311]', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#E8B33D]', 'ring-offset-2', 'ring-offset-[#161311]', 'transition-all');
      }, 2000);
    }
  };

  // Insert emoticon or meme into input
  const handleInsertEmoticon = (emoticon: string) => {
    if (!inputRef.current) {
      setInputText((prev) => prev + emoticon + ' ');
      return;
    }
    const cursorPos = inputRef.current.selectionStart || inputText.length;
    const before = inputText.slice(0, cursorPos);
    const after = inputText.slice(cursorPos);
    const updated = `${before}${emoticon} ${after}`;
    setInputText(updated);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const nextPos = cursorPos + emoticon.length + 1;
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 20);
  };

  // Handle text input change & mention trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    const cursorPos = e.target.selectionStart;
    setMentionCursorPos(cursorPos);

    // Look for '@' before cursor
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const queryStr = textBeforeCursor.slice(lastAtIdx + 1);
      // Valid mention query: no spaces or up to 20 chars
      if (!queryStr.includes(' ') && queryStr.length <= 20) {
        setMentionQuery(queryStr);
        setMentionSelectedIdx(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  // Insert mention into input
  const handleSelectMention = (playerName: string) => {
    if (!inputRef.current) return;
    const text = inputText;
    const textBeforeCursor = text.slice(0, mentionCursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    if (lastAtIdx === -1) return;

    const beforeAt = text.slice(0, lastAtIdx);
    const afterCursor = text.slice(mentionCursorPos);
    const updated = `${beforeAt}@${playerName} ${afterCursor}`;
    setInputText(updated);
    setMentionQuery(null);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = lastAtIdx + playerName.length + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  // Keydown in input (for mentions or send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionPlayers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIdx((prev) => (prev + 1) % filteredMentionPlayers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIdx((prev) => (prev - 1 + filteredMentionPlayers.length) % filteredMentionPlayers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredMentionPlayers[mentionSelectedIdx];
        if (chosen) handleSelectMention(chosen.name);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    if (!session || !session.isLoggedIn) {
      openLogin();
      return;
    }

    const content = inputText.trim();
    setInputText('');
    setMentionQuery(null);
    setShouldAutoScroll(true);

    // Extract @mentions
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const foundMentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      foundMentions.push(match[1]);
    }

    await sendChatMessage({
      senderName: session.playerName,
      senderAvatar: session.avatar_url,
      senderTier: session.tier,
      senderJulukan: session.julukan,
      content,
      mentions: foundMentions.length > 0 ? foundMentions : undefined,
      ...(replyingTo && {
        replyTo: {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content.slice(0, 150),
        },
      }),
    });

    setReplyingTo(null);
    setIsInputEmojiPickerOpen(false);
  };

  // Toggle reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!session || !session.isLoggedIn) {
      openLogin();
      return;
    }
    await toggleEmojiReaction(messageId, emoji, session.playerName);
    setShowEmojiPickerFor(null);
  };

  // Admin Pin
  const handleTogglePin = async (message: ChatMessage) => {
    if (!isAdmin) return;
    const newStatus = !message.isPinned;
    await pinChatMessage(message.id, newStatus, session?.playerName || 'Admin');
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    await deleteChatMessage(messageId);
  };

  // Format timestamp
  const formatTime = (isoString?: string, ts?: number) => {
    const d = ts ? new Date(ts) : isoString ? new Date(isoString) : new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Tier color styling
  const getTierColor = (tier: string = '') => {
    const t = tier.toLowerCase();
    if (t.includes('immortal')) return 'text-amber-300 bg-amber-950/60 border-amber-500/50';
    if (t.includes('glory') || t.includes('honor') || t.includes('mythic')) return 'text-rose-300 bg-rose-950/60 border-rose-500/50';
    if (t.includes('legend')) return 'text-[#E8B33D] bg-[#E8B33D]/15 border-[#E8B33D]/40';
    if (t.includes('epic')) return 'text-emerald-300 bg-emerald-950/50 border-emerald-500/50';
    return 'text-[#9C948A] bg-[#241F1B] border-[#332C25]';
  };

  // Render message text with highlighted @mentions
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_.-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const mentioned = part.slice(1);
        const isMe = session?.playerName.toLowerCase() === mentioned.toLowerCase();
        return (
          <span
            key={`mention-${idx}`}
            className={`inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md text-xs font-bold ${
              isMe
                ? 'bg-[#E8B33D] text-[#161311] ring-1 ring-[#F3C256]'
                : 'bg-[#E8B33D]/20 text-[#E8B33D] border border-[#E8B33D]/30'
            }`}
          >
            @{mentioned}
          </span>
        );
      }
      return <span key={`text-${idx}`}>{part}</span>;
    });
  };

  return (
    <div
      id="community-lobby-chat"
      className={`flex flex-col h-[700px] max-h-[85vh] w-full rounded-2xl border border-[#332C25] bg-[#161311] shadow-2xl overflow-hidden relative ${className}`}
    >
      {/* 1. CHAT TOPBAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1D1916] border-b border-[#332C25] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8B33D]/15 text-[#E8B33D] border border-[#E8B33D]/30 shadow-inner">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#F2EDE4] leading-tight">
                Lobby Chat Komunitas
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F7942]/20 text-[#7BB368] border border-[#4F7942]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4F7942] animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-[#9C948A]">
              Grup utama pemain Laga Amal Pantos (~14-20 pemain)
            </p>
          </div>
        </div>

        {/* Player Session Controls — satu tombol/menu akun yang sama dipakai di seluruh app */}
        <PlayerAccountMenu />
      </div>

      {/* 2 & 3. CHAT CONTENT AREA (BLURRED WHEN USER NOT LOGGED IN) */}
      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 2. PINNED MESSAGE BANNER */}
        {pinnedMessage && (
          <div
            id="chat-pinned-banner"
            className={`flex items-center justify-between px-4 py-2 bg-[#E8B33D]/10 border-b border-[#E8B33D]/30 shrink-0 text-xs text-[#F2EDE4] transition-all duration-300 ${
              !isLoggedIn ? 'filter blur-xs select-none pointer-events-none opacity-30' : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Pin size={14} className="text-[#E8B33D] shrink-0 fill-[#E8B33D]" />
              <span className="font-bold text-[#E8B33D] shrink-0">Pesan Disematkan:</span>
              <span className="text-[#F2EDE4]/90 truncate">
                <strong className="text-[#E8B33D]">{pinnedMessage.senderName}: </strong>
                {pinnedMessage.content}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={() => handleTogglePin(pinnedMessage)}
                className="text-[10px] text-[#9C948A] hover:text-[#F2EDE4] font-medium ml-2 shrink-0 underline cursor-pointer"
              >
                Lepas Pin
              </button>
            )}
          </div>
        )}

        {/* 3. MESSAGE STREAM */}
        <div
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          id="chat-messages-container"
          className={`flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth transition-all duration-300 ${
            !isLoggedIn ? 'filter blur-md select-none pointer-events-none opacity-25' : ''
          }`}
        >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div className="h-12 w-12 rounded-2xl bg-[#241F1B] border border-[#332C25] flex items-center justify-center text-[#E8B33D] mb-3">
              <MessageSquare size={24} />
            </div>
            <h4 className="text-sm font-bold text-[#F2EDE4]">Belum ada pesan di Lobby</h4>
            <p className="text-xs text-[#9C948A] max-w-sm mt-1">
              Jadilah yang pertama menyapa rekan tim, atau input match baru untuk melihat pengumuman otomatis!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = session?.playerName.toLowerCase() === msg.senderName.toLowerCase();
            const reactionsList = (Object.values(msg.reactions || {}) as ChatReaction[]).filter((r) => r.count > 0);

            // SPECIAL SYSTEM MESSAGE (Match Result)
            if (msg.isSystem && msg.systemType === 'match_result') {
              return (
                <div
                  key={msg.id}
                  id={`chat-system-msg-${msg.id}`}
                  className="mx-auto my-3 max-w-lg rounded-xl border border-[#E8B33D]/40 bg-gradient-to-r from-[#241F1B] via-[#2D241C] to-[#241F1B] p-3.5 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-[#E8B33D]/20 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E8B33D]/20 text-[#E8B33D]">
                        <Swords size={14} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-[#E8B33D]">
                        Hasil Pertandingan
                      </span>
                      {msg.matchData?.seasonName && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#161311] text-[#9C948A] border border-[#332C25]">
                          {msg.matchData.seasonName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#9C948A]">
                      {formatTime(msg.createdAt, msg.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-[#F2EDE4] leading-relaxed">
                    {msg.content}
                  </p>

                  {/* MVP Banner */}
                  {msg.matchData?.mvpPlayer && (
                    <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#161311]/70 border border-[#332C25] px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-[#E8B33D]" />
                        <span className="text-xs text-[#9C948A]">MVP Match:</span>
                        <span className="text-xs font-black text-[#E8B33D]">
                          {msg.matchData.mvpPlayer}
                        </span>
                        {msg.matchData.mvpHero && (
                          <HeroAvatar heroName={msg.matchData.mvpHero} size="xs" />
                        )}
                      </div>
                      {onOpenMatchDetail && msg.matchData.matchId && (
                        <button
                          onClick={() => onOpenMatchDetail(msg.matchData!.matchId)}
                          className="text-[10px] font-bold text-[#E8B33D] hover:underline cursor-pointer"
                        >
                          Detail Match →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reactions on system message */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {reactionsList.map((reaction) => {
                      const userHasReacted = session ? reaction.users.includes(session.playerName) : false;
                      return (
                        <button
                          key={`reaction-${reaction.emoji}`}
                          onClick={() => handleToggleReaction(msg.id, reaction.emoji)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors cursor-pointer ${
                            userHasReacted
                              ? 'bg-[#E8B33D]/25 text-[#E8B33D] border border-[#E8B33D]'
                              : 'bg-[#1D1916] text-[#9C948A] border border-[#332C25] hover:border-[#9C948A]'
                          }`}
                          title={`Bereaksi: ${reaction.users.join(', ')}`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[10px] font-bold">{reaction.count}</span>
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#1D1916] border border-[#332C25] text-[#9C948A] hover:text-[#E8B33D] hover:border-[#E8B33D]/50 text-xs transition-colors cursor-pointer"
                      title="Tambah Reaksi"
                    >
                      <Smile size={12} />
                    </button>
                  </div>

                  {/* Emoji Quick Picker */}
                  {showEmojiPickerFor === msg.id && (
                    <div className="mt-2 flex items-center gap-1 p-1 rounded-xl bg-[#1D1916] border border-[#332C25] w-fit">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="p-1 hover:bg-[#241F1B] rounded text-sm transition-transform hover:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // STANDARD PLAYER MESSAGE
            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={`group relative flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar with click to floating profile / zoom */}
                <button
                  type="button"
                  onClick={() =>
                    handleAvatarClick(
                      msg.senderName,
                      msg.senderAvatar,
                      msg.senderTier,
                      msg.senderJulukan
                    )
                  }
                  className="shrink-0 pt-0.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95 focus:outline-none"
                  title="Klik untuk lihat profil ringkas & foto pemain"
                >
                  <PlayerAvatar
                    name={msg.senderName}
                    avatarUrl={msg.senderAvatar}
                    size="md"
                    className="shadow-sm hover:ring-2 hover:ring-[#E8B33D]/60 rounded-full transition-all"
                  />
                </button>

                {/* Message Bubble Container */}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name, Tier, Julukan & Timestamp */}
                  <div className={`flex flex-wrap items-center gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <button
                      type="button"
                      onClick={() =>
                        handleAvatarClick(
                          msg.senderName,
                          msg.senderAvatar,
                          msg.senderTier,
                          msg.senderJulukan
                        )
                      }
                      className="text-xs font-black text-[#F2EDE4] hover:text-[#E8B33D] transition-colors cursor-pointer"
                    >
                      {msg.senderName}
                    </button>

                    {msg.senderTier && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getTierColor(
                          msg.senderTier
                        )}`}
                      >
                        {msg.senderTier}
                      </span>
                    )}

                    {msg.senderJulukan && (
                      <span className="hidden md:inline text-[10px] text-[#9C948A] italic truncate max-w-[200px]">
                        "{msg.senderJulukan}"
                      </span>
                    )}

                    <span className="text-[10px] text-[#6E655C]">
                      {formatTime(msg.createdAt, msg.timestamp)}
                    </span>

                    {msg.isPinned && (
                      <Pin size={11} className="text-[#E8B33D] fill-[#E8B33D] ml-0.5" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md ${
                      isMe
                        ? 'bg-[#E8B33D] text-[#161311] rounded-tr-none font-medium'
                        : 'bg-[#241F1B] text-[#F2EDE4] border border-[#332C25] rounded-tl-none'
                    }`}
                  >
                    {/* Replying quote preview if this message is a reply */}
                    {msg.replyTo && (
                      <div
                        onClick={() => scrollToMessage(msg.replyTo!.id)}
                        className={`mb-2 flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer ${
                          isMe
                            ? 'bg-black/15 border-l-2 border-[#161311] text-[#161311] hover:bg-black/20'
                            : 'bg-[#191513] border-l-2 border-[#E8B33D] text-[#9C948A] hover:bg-[#1f1a17] hover:text-[#F2EDE4]'
                        }`}
                        title="Klik untuk melihat pesan yang dibalas"
                      >
                        <Reply size={12} className="shrink-0 mt-0.5 opacity-80" />
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-bold text-[11px] block truncate text-current">
                            {msg.replyTo.senderName}
                          </span>
                          <span className="italic text-[10px] block truncate opacity-85">
                            {msg.replyTo.content}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap break-words">
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>

                  {/* Reaction & Action Badges */}
                  <div className={`mt-1 flex flex-wrap items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {reactionsList.map((reaction) => {
                      const userHasReacted = session ? reaction.users.includes(session.playerName) : false;
                      return (
                        <button
                          key={`react-${msg.id}-${reaction.emoji}`}
                          onClick={() => handleToggleReaction(msg.id, reaction.emoji)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors cursor-pointer ${
                            userHasReacted
                              ? 'bg-[#E8B33D]/25 text-[#E8B33D] border border-[#E8B33D]'
                              : 'bg-[#1D1916] text-[#9C948A] border border-[#332C25] hover:border-[#9C948A]'
                          }`}
                          title={`Bereaksi: ${reaction.users.join(', ')}`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[10px] font-bold">{reaction.count}</span>
                        </button>
                      );
                    })}

                    {/* Reply Action Button */}
                    <button
                      type="button"
                      onClick={() => handleStartReply(msg)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-full bg-[#1D1916] border border-[#332C25] hover:border-[#E8B33D]/50 text-[#9C948A] hover:text-[#E8B33D] px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                      title="Balas pesan ini"
                    >
                      <Reply size={10} />
                      <span>Balas</span>
                    </button>

                    {/* Quick Reaction Button on Hover */}
                    <button
                      onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#1D1916] border border-[#332C25] text-[#9C948A] hover:text-[#E8B33D] text-[10px] cursor-pointer"
                      title="Beri Reaksi"
                    >
                      <Smile size={11} />
                    </button>

                    {/* Admin Moderation (Pin / Delete) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleTogglePin(msg)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#1D1916] border border-[#332C25] text-[10px] cursor-pointer ${
                          msg.isPinned ? 'text-[#E8B33D]' : 'text-[#9C948A] hover:text-[#E8B33D]'
                        }`}
                        title={msg.isPinned ? 'Lepas Pin' : 'Sematkan Pesan'}
                      >
                        <Pin size={11} className={msg.isPinned ? 'fill-[#E8B33D]' : ''} />
                      </button>
                    )}

                    {(isAdmin || isMe) && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#1D1916] border border-[#332C25] text-[#9C948A] hover:text-red-400 text-[10px] cursor-pointer"
                        title="Hapus Pesan"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  {/* Popover Emoji Picker for this message */}
                  {showEmojiPickerFor === msg.id && (
                    <div className="mt-1 flex items-center gap-1 p-1 rounded-xl bg-[#1D1916] border border-[#332C25] shadow-lg z-10 flex-wrap max-w-xs">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="p-1 hover:bg-[#241F1B] rounded text-sm transition-transform hover:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* LOCKED BLUR OVERLAY FOR GUEST / UNLOGGED USERS */}
      {!isLoggedIn && (
        <div
          id="chat-locked-overlay"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#161311]/60 backdrop-blur-[3px] text-center"
        >
          <div className="flex flex-col items-center max-w-sm w-full p-6 rounded-2xl bg-[#1D1916]/95 border border-[#3D352E] shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8B33D]/15 text-[#E8B33D] border border-[#E8B33D]/30 mb-4 shadow-inner">
              <Lock size={26} />
            </div>
            <h4 className="text-base font-black text-[#F2EDE4] mb-1.5">
              Lobby Chat Terkunci
            </h4>
            <p className="text-xs text-[#9C948A] leading-relaxed mb-5">
              Seluruh percakapan di Lobby Chat diburamkan karena Anda belum login. Masuk dengan nama pemain &amp; PIN Anda untuk melihat percakapan secara normal.
            </p>
            <button
              id="btn-login-overlay"
              onClick={() => {
                openLogin();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] shadow-lg shadow-[#E8B33D]/15 transition-all active:scale-95 cursor-pointer"
            >
              <KeyRound size={16} />
              <span>Login Pemain Sekarang</span>
            </button>
          </div>
        </div>
      )}
    </div>

      {/* 4. MENTION AUTOCOMPLETE POPUP */}
      {mentionQuery !== null && filteredMentionPlayers.length > 0 && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-6 sm:w-80 bg-[#1D1916] border border-[#332C25] rounded-xl shadow-2xl overflow-hidden z-20">
          <div className="px-3 py-1.5 bg-[#241F1B] border-b border-[#332C25] text-[10px] font-bold text-[#9C948A] flex items-center gap-1">
            <AtSign size={10} />
            <span>Sebut Pemain (@)</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredMentionPlayers.map((player, idx) => {
              const isSelected = idx === mentionSelectedIdx;
              return (
                <button
                  key={player.id}
                  onClick={() => handleSelectMention(player.name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8B33D] text-[#161311] font-bold'
                      : 'text-[#F2EDE4] hover:bg-[#241F1B]'
                  }`}
                >
                  <PlayerAvatar name={player.name} avatarUrl={player.avatar_url} size="xs" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{player.name}</span>
                    <span
                      className={`text-[9px] ${
                        isSelected ? 'text-[#161311]/80' : 'text-[#9C948A]'
                      }`}
                    >
                      {player.tier}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. EMOTICON & TRENDING MEME PICKER DRAWER */}
      {isInputEmojiPickerOpen && (
        <div
          ref={emojiPickerRef}
          id="chat-emoticon-picker-popup"
          className="absolute bottom-20 right-3 sm:right-6 left-3 sm:left-auto sm:w-96 bg-[#1D1916] border border-[#3D352E] rounded-2xl shadow-2xl overflow-hidden z-30 animate-fadeIn"
        >
          {/* Header & Tabs */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#241F1B] border-b border-[#332C25]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEmojiCategoryTab('meme')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  emojiCategoryTab === 'meme'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🔥 Meme Trend
              </button>
              <button
                type="button"
                onClick={() => setEmojiCategoryTab('emoji')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  emojiCategoryTab === 'emoji'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                😀 Emoticon
              </button>
              <button
                type="button"
                onClick={() => setEmojiCategoryTab('gaming')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  emojiCategoryTab === 'gaming'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🎮 MLBB
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsInputEmojiPickerOpen(false)}
              className="text-[#9C948A] hover:text-[#F2EDE4] p-1 rounded-lg cursor-pointer"
              title="Tutup"
            >
              <X size={15} />
            </button>
          </div>

          {/* Grid of Emoticons */}
          <div className="p-3 max-h-56 overflow-y-auto">
            {emojiCategoryTab === 'meme' ? (
              <div className="grid grid-cols-2 gap-1.5">
                {MEME_EMOTICONS.filter((item) => item.category === 'meme').map((item, idx) => (
                  <button
                    key={`meme-item-${idx}`}
                    type="button"
                    onClick={() => handleInsertEmoticon(item.value)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#241F1B] hover:bg-[#2D2520] border border-[#332C25] hover:border-[#E8B33D]/50 text-left text-xs text-[#F2EDE4] transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <span className="text-base">{item.value.split(' ')[0]}</span>
                    <span className="text-[11px] font-semibold text-[#F2EDE4] truncate">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                {MEME_EMOTICONS.filter((item) => item.category === emojiCategoryTab).map((item, idx) => (
                  <button
                    key={`emoji-item-${idx}`}
                    type="button"
                    onClick={() => handleInsertEmoticon(item.value)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F1B] hover:bg-[#2D2520] border border-[#332C25] hover:border-[#E8B33D] text-lg hover:scale-125 transition-all cursor-pointer"
                    title={item.label}
                  >
                    {item.value}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. FLOATING PLAYER PROFILE MODAL */}
      {floatingPlayer && (
        <div
          id="floating-player-profile-backdrop"
          className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
          onClick={() => setFloatingPlayerName(null)}
        >
          <div
            id="floating-player-profile-card"
            className="relative w-full max-w-sm rounded-2xl border border-[#3D352E] bg-[#1D1916] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setFloatingPlayerName(null)}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F1B] text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2F2823] transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>

            {/* Avatar & Photo Click Hint */}
            <div className="flex flex-col items-center text-center">
              <div
                onClick={() => {
                  setZoomedImagePlayer({
                    name: floatingPlayer.name,
                    url: floatingPlayer.avatar_url || getPlayerAvatarUrl(floatingPlayer.name),
                    tier: floatingPlayer.tier,
                    status: floatingPlayer.status,
                    julukan: floatingPlayer.julukan,
                  });
                }}
                className="relative group cursor-pointer rounded-2xl p-1 bg-gradient-to-b from-[#E8B33D]/40 to-transparent border border-[#E8B33D]/40 hover:border-[#E8B33D] transition-all hover:scale-105 shadow-lg"
                title="Klik foto untuk memperbesar tampilan"
              >
                <PlayerAvatar
                  name={floatingPlayer.name}
                  avatarUrl={floatingPlayer.avatar_url}
                  size="xl"
                  className="rounded-xl shadow-md"
                />
                <div className="absolute inset-0 rounded-xl bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[#F2EDE4] transition-opacity">
                  <ZoomIn size={22} className="text-[#E8B33D] mb-1" />
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded bg-black/70">Perbesar</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setZoomedImagePlayer({
                    name: floatingPlayer.name,
                    url: floatingPlayer.avatar_url || getPlayerAvatarUrl(floatingPlayer.name),
                    tier: floatingPlayer.tier,
                    status: floatingPlayer.status,
                    julukan: floatingPlayer.julukan,
                  });
                }}
                className="text-[11px] text-[#E8B33D] hover:underline mt-1.5 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ZoomIn size={12} /> Klik foto untuk perbesar
              </button>

              {/* Name & Badges */}
              <h4 className="text-lg font-black text-[#F2EDE4] mt-2">
                {floatingPlayer.name}
              </h4>

              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                {floatingPlayer.tier && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTierColor(
                      floatingPlayer.tier
                    )}`}
                  >
                    {floatingPlayer.tier}
                  </span>
                )}
                {floatingPlayer.status && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      floatingPlayer.status === 'Cabutan'
                        ? 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {floatingPlayer.status}
                  </span>
                )}
              </div>

              {floatingPlayer.julukan && (
                <p className="text-xs text-[#E8B33D] italic mt-1 font-medium">
                  "{floatingPlayer.julukan}"
                </p>
              )}

              {/* Season Rank Badge */}
              <div className="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-[#241F1B] border border-[#332C25] px-3.5 py-2 w-full">
                <Trophy size={15} className="text-[#E8B33D] shrink-0" />
                <span className="text-xs text-[#9C948A]">
                  Peringkat ({activeSeason?.title || 'Season Aktif'}):
                </span>
                {floatingPlayerSeasonRank > 0 ? (
                  <span className="text-xs font-black text-[#E8B33D]">
                    #{floatingPlayerSeasonRank}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[#9C948A] italic">
                    Belum bertanding
                  </span>
                )}
              </div>

              {/* Quick Season / Career Stats */}
              <div className="grid grid-cols-4 gap-2 mt-2.5 w-full">
                <div className="rounded-lg bg-[#161311] border border-[#332C25] p-2 text-center">
                  <span className="block text-xs font-bold text-[#E8B33D]">
                    {floatingPlayerSeasonStat?.matches ?? floatingPlayer.total_match ?? 0}
                  </span>
                  <span className="text-[9px] text-[#9C948A] uppercase">Match</span>
                </div>
                <div className="rounded-lg bg-[#161311] border border-[#332C25] p-2 text-center">
                  <span className="block text-xs font-bold text-emerald-400">
                    {floatingPlayerSeasonStat?.winRate ?? floatingPlayer.winRate ?? 0}%
                  </span>
                  <span className="text-[9px] text-[#9C948A] uppercase">WR</span>
                </div>
                <div className="rounded-lg bg-[#161311] border border-[#332C25] p-2 text-center">
                  <span className="block text-xs font-bold text-amber-300">
                    👑 {floatingPlayerSeasonStat?.mvp ?? floatingPlayer.medals?.MVP ?? 0}
                  </span>
                  <span className="text-[9px] text-[#9C948A] uppercase">MVP</span>
                </div>
                <div className="rounded-lg bg-[#161311] border border-[#332C25] p-2 text-center">
                  <span className="block text-xs font-bold text-[#8C6D58]">
                    🍫 {floatingPlayerSeasonStat?.coklat ?? floatingPlayer.medals?.Coklat ?? 0}
                  </span>
                  <span className="text-[9px] text-[#9C948A] uppercase">Coklat</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-4 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setZoomedImagePlayer({
                      name: floatingPlayer.name,
                      url: floatingPlayer.avatar_url || getPlayerAvatarUrl(floatingPlayer.name),
                      tier: floatingPlayer.tier,
                      status: floatingPlayer.status,
                      julukan: floatingPlayer.julukan,
                    });
                  }}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold bg-[#241F1B] hover:bg-[#2D2520] text-[#E8B33D] border border-[#E8B33D]/30 transition-all cursor-pointer"
                >
                  <ZoomIn size={14} />
                  <span>Perbesar Foto Profil</span>
                </button>

                {onViewPlayerProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setFloatingPlayerName(null);
                      onViewPlayerProfile(floatingPlayer.id || floatingPlayer.name);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] transition-all cursor-pointer shadow-md"
                  >
                    <UserRound size={14} />
                    <span>Buka Profil Lengkap →</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleSelectMention(floatingPlayer.name);
                    setFloatingPlayerName(null);
                  }}
                  className="text-[11px] text-[#9C948A] hover:text-[#F2EDE4] transition-colors py-1 cursor-pointer"
                >
                  Sebut @{floatingPlayer.name} di chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. ENLARGED PHOTO PREVIEW MODAL */}
      {zoomedImagePlayer && (
        <ImagePreviewModal
          isOpen={Boolean(zoomedImagePlayer)}
          onClose={() => setZoomedImagePlayer(null)}
          imageUrl={zoomedImagePlayer.url}
          playerName={zoomedImagePlayer.name}
          tier={zoomedImagePlayer.tier}
          status={zoomedImagePlayer.status}
          julukan={zoomedImagePlayer.julukan}
          isAdmin={isAdmin}
        />
      )}

      {/* 8. CHAT INPUT BAR */}
      <div className="p-3 bg-[#1D1916] border-t border-[#332C25] shrink-0">
        {session && session.isLoggedIn ? (
          <div>
            {/* Replying banner */}
            {replyingTo && (
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#241F1B] border-t border-x border-[#332C25] rounded-t-xl text-xs text-[#F2EDE4] mb-0 animate-fadeIn">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply size={13} className="text-[#E8B33D] shrink-0" />
                  <div className="truncate">
                    <span className="text-[#9C948A] text-[11px]">Membalas </span>
                    <strong className="text-[#E8B33D]">{replyingTo.senderName}</strong>
                    <span className="text-[#9C948A] mx-1">:</span>
                    <span className="text-[#F2EDE4]/80 italic truncate">{replyingTo.content}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-[#9C948A] hover:text-[#F2EDE4] p-1 rounded-md transition-colors cursor-pointer"
                  title="Batal membalas"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  id="chat-input-textarea"
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Tulis pesan ke Lobby... (ketik @ mention, klik icon smile untuk meme)"
                  className={`w-full resize-none bg-[#161311] border border-[#332C25] px-3.5 py-2.5 text-sm text-[#F2EDE4] placeholder-[#6E655C] focus:border-[#E8B33D] focus:outline-none focus:ring-1 focus:ring-[#E8B33D] max-h-28 overflow-y-auto leading-normal ${
                    replyingTo ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'
                  }`}
                />
              </div>

              {/* Emoticon & Meme Button */}
              <button
                id="chat-emoticon-btn"
                type="button"
                onClick={() => setIsInputEmojiPickerOpen(!isInputEmojiPickerOpen)}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  isInputEmojiPickerOpen
                    ? 'bg-[#E8B33D] text-[#161311] border-[#E8B33D]'
                    : 'bg-[#241F1B] hover:bg-[#2D2520] text-[#E8B33D] border-[#332C25]'
                }`}
                title="Buka Emoticon & Tren Meme"
              >
                <Smile size={19} />
              </button>

              {/* Send Button */}
              <button
                id="chat-send-btn"
                type="submit"
                disabled={!inputText.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md cursor-pointer"
                title="Kirim Pesan (Enter)"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#241F1B]/70 border border-[#332C25] rounded-xl p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8B33D]/15 text-[#E8B33D]">
                <KeyRound size={16} />
              </div>
              <div className="text-xs">
                <span className="font-bold text-[#F2EDE4]">Ingin ikut mengobrol?</span>
                <p className="text-[#9C948A] text-[11px]">
                  Pilih nama pemain Anda & masukkan PIN untuk bergabung ke percakapan.
                </p>
              </div>
            </div>
            <button
              id="btn-login-to-chat"
              onClick={() => {
                openLogin();
              }}
              className="px-4 py-2 rounded-xl text-xs font-black bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Login Pemain (Nama + PIN)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
