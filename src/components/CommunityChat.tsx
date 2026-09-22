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
} from 'lucide-react';
import { Player, Match, ChatMessage, ChatReaction } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { usePlayerAuth } from '../contexts/PlayerAuthContext';
import { PlayerAccountMenu } from './PlayerAccountMenu';
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
  className?: string;
}

const QUICK_EMOJIS = ['🔥', '😂', '👑', '💀', '👏', '🗿', '🤡', '❤️'];

export const CommunityChat: React.FC<CommunityChatProps> = ({
  players,
  isAdmin = false,
  onOpenMatchDetail,
  className = '',
}) => {
  const { session, isLoggedIn, openLogin } = usePlayerAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  // Modals & UI States
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);
  const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsub = subscribeToChatMessages((fetchedMessages) => {
      setMessages(fetchedMessages);
    });
    return () => unsub();
  }, []);

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
    });
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
                {/* Avatar */}
                <div className="shrink-0 pt-0.5">
                  <PlayerAvatar
                    name={msg.senderName}
                    avatarUrl={msg.senderAvatar}
                    size="md"
                    className="shadow-sm"
                  />
                </div>

                {/* Message Bubble Container */}
                <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name, Tier, Julukan & Timestamp */}
                  <div className={`flex flex-wrap items-center gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-xs font-black text-[#F2EDE4]">
                      {msg.senderName}
                    </span>

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
                    <div className="whitespace-pre-wrap break-words">
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>

                  {/* Reaction Badges */}
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
                    <div className="mt-1 flex items-center gap-1 p-1 rounded-xl bg-[#1D1916] border border-[#332C25] shadow-lg z-10">
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

      {/* 5. CHAT INPUT BAR */}
      <div className="p-3 bg-[#1D1916] border-t border-[#332C25] shrink-0">
        {session && session.isLoggedIn ? (
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
                placeholder="Tulis pesan ke Lobby... (ketik @ untuk mention)"
                className="w-full resize-none rounded-xl bg-[#161311] border border-[#332C25] px-3.5 py-2.5 text-sm text-[#F2EDE4] placeholder-[#6E655C] focus:border-[#E8B33D] focus:outline-none focus:ring-1 focus:ring-[#E8B33D] max-h-28 overflow-y-auto leading-normal"
              />
            </div>

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
