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
  Film,
  Search,
  GitBranch,
  Loader2,
  Plus,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCheck,
} from 'lucide-react';
import { Player, Match, Season, ChatMessage, ChatReaction, LagaAmalSeasonData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { usePlayerAuth } from '../contexts/PlayerAuthContext';
import { PlayerAccountMenu } from './PlayerAccountMenu';
import { ImagePreviewModal } from './ImagePreviewModal';
import { GitSyncModal } from './GitSyncModal';
import { MentionNotificationToast } from './MentionNotificationToast';
import { getPlayerAvatarUrl } from '../constants/playerAvatars';
import {
  CURATED_CHAT_EMOTES,
  EMOTE_NAME_MAP,
  TOP_EMOTE_REACTIONS,
  search7tvLiveEmotes,
  ChatEmote,
} from '../constants/chatEmotes';
import {
  CURATED_CHAT_GIFS,
  searchChatGifs,
  ChatGifItem,
} from '../constants/chatGifs';
import {
  subscribeToChatMessages,
  sendChatMessage,
  toggleEmojiReaction,
  pinChatMessage,
  deleteChatMessage,
} from '../services/chatService';
import {
  playMentionChime,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  getReadMentionIds,
  markMentionAsRead,
  markAllMentionsAsRead,
} from '../services/notificationService';

interface CommunityChatProps {
  players: Player[];
  matches?: Match[];
  seasons?: Season[];
  isAdmin?: boolean;
  onOpenMatchDetail?: (matchId: string | number) => void;
  onViewPlayerProfile?: (nicknameOrId: string | number) => void;
  activeSeason?: LagaAmalSeasonData;
  targetMessageId?: string;
  className?: string;
}

export const CommunityChat: React.FC<CommunityChatProps> = ({
  players,
  matches = [],
  seasons = [],
  isAdmin = false,
  onOpenMatchDetail,
  onViewPlayerProfile,
  activeSeason,
  targetMessageId,
  className = '',
}) => {
  const { session, isLoggedIn, openLogin } = usePlayerAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  // Modals & UI States
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [isInputEmojiPickerOpen, setIsInputEmojiPickerOpen] = useState(false);
  const [emoteCategoryTab, setEmoteCategoryTab] = useState<'chad' | 'troll' | 'beban' | 'dance' | 'all'>('chad');
  const [emoteSearchQuery, setEmoteSearchQuery] = useState('');
  const [live7tvEmotes, setLive7tvEmotes] = useState<ChatEmote[]>([]);
  const [isSearching7tv, setIsSearching7tv] = useState(false);

  // GIF Drawer states
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [gifCategoryTab, setGifCategoryTab] = useState<'all' | 'mlbb' | 'meme' | 'victory' | 'sad'>('all');
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [customGifUrl, setCustomGifUrl] = useState('');

  // Git Modal state
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);

  // Notification states for @mentions
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [readMentionIds, setReadMentionIds] = useState<Set<string>>(() => {
    return session?.playerName ? getReadMentionIds(session.playerName) : new Set();
  });
  const [isSoundEnabled, setIsSoundEnabledState] = useState<boolean>(() => isNotificationSoundEnabled());
  const [activeToast, setActiveToast] = useState<{
    message: ChatMessage;
    senderName: string;
    senderAvatar?: string;
    senderTier?: string;
  } | null>(null);

  const notificationDrawerRef = useRef<HTMLDivElement>(null);
  const lastProcessedMsgIdRef = useRef<string | null>(null);
  const initialLoadCompleteRef = useRef<boolean>(false);

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
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsub = subscribeToChatMessages((fetchedMessages) => {
      setMessages(fetchedMessages);
    });
    return () => unsub();
  }, []);

  // Update read mention IDs whenever session changes
  useEffect(() => {
    if (!session?.playerName) return;
    setReadMentionIds(getReadMentionIds(session.playerName));
  }, [session?.playerName]);

  // Target message navigation effect
  useEffect(() => {
    if (targetMessageId && messages.length > 0) {
      setTimeout(() => {
        scrollToMessage(targetMessageId);
      }, 350);
    }
  }, [targetMessageId, messages.length]);

  // Real-time mention detection & alerting for the logged-in player
  useEffect(() => {
    if (!session?.playerName || messages.length === 0) {
      if (messages.length > 0) initialLoadCompleteRef.current = true;
      return;
    }

    const latestMsg = messages[messages.length - 1];
    if (!latestMsg || latestMsg.id === lastProcessedMsgIdRef.current) {
      return;
    }

    lastProcessedMsgIdRef.current = latestMsg.id;

    // Skip playing chime on initial first fetch of history
    if (!initialLoadCompleteRef.current) {
      initialLoadCompleteRef.current = true;
      return;
    }

    const myName = session.playerName.trim().toLowerCase();
    const isSenderMe = latestMsg.senderName?.trim().toLowerCase() === myName;
    if (isSenderMe) return;

    const isMentioned =
      latestMsg.mentions?.some((name) => name.trim().toLowerCase() === myName) ||
      latestMsg.content.toLowerCase().includes(`@${myName}`);

    if (isMentioned) {
      // 1. Play crisp audio chime
      playMentionChime();

      // 2. Show native browser notification
      showBrowserNotification(
        latestMsg.senderName,
        latestMsg.content,
        latestMsg.senderAvatar
      );

      // 3. Show interactive in-app toast
      setActiveToast({
        message: latestMsg,
        senderName: latestMsg.senderName,
        senderAvatar: latestMsg.senderAvatar,
        senderTier: latestMsg.senderTier,
      });
    }
  }, [messages, session?.playerName]);

  // Close pickers on outside click
  useEffect(() => {
    if (!isInputEmojiPickerOpen && !isGifPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isInputEmojiPickerOpen &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        !(e.target as HTMLElement).closest('#chat-emoticon-btn')
      ) {
        setIsInputEmojiPickerOpen(false);
      }
      if (
        isGifPickerOpen &&
        gifPickerRef.current &&
        !gifPickerRef.current.contains(target) &&
        !(e.target as HTMLElement).closest('#chat-gif-btn')
      ) {
        setIsGifPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInputEmojiPickerOpen, isGifPickerOpen]);

  // Live search 7TV emotes when query is entered
  useEffect(() => {
    if (!emoteSearchQuery.trim() || emoteSearchQuery.trim().length < 2) {
      setLive7tvEmotes([]);
      setIsSearching7tv(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching7tv(true);
      try {
        const results = await search7tvLiveEmotes(emoteSearchQuery, 14);
        setLive7tvEmotes(results);
      } finally {
        setIsSearching7tv(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [emoteSearchQuery]);

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

  // Mentions for the logged-in player
  const userMentions = useMemo(() => {
    if (!session?.playerName) return [];
    const myName = session.playerName.trim().toLowerCase();
    return messages
      .filter((m) => {
        if (!m || !m.content) return false;
        if (m.senderName?.trim().toLowerCase() === myName) return false;
        const inMentionsArray = m.mentions?.some((name) => name.trim().toLowerCase() === myName);
        const inContent = m.content.toLowerCase().includes(`@${myName}`);
        return inMentionsArray || inContent;
      })
      .reverse(); // newest first
  }, [messages, session?.playerName]);

  const unreadMentionsCount = useMemo(() => {
    return userMentions.filter((m) => !readMentionIds.has(m.id)).length;
  }, [userMentions, readMentionIds]);

  const handleMarkMentionRead = (msgId: string) => {
    if (!session?.playerName) return;
    markMentionAsRead(session.playerName, msgId);
    setReadMentionIds((prev) => new Set(prev).add(msgId));
  };

  const handleMarkAllMentionsRead = () => {
    if (!session?.playerName || userMentions.length === 0) return;
    const allIds = userMentions.map((m) => m.id);
    markAllMentionsAsRead(session.playerName, allIds);
    setReadMentionIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleJumpToMention = (msgId: string) => {
    handleMarkMentionRead(msgId);
    setIsNotificationDrawerOpen(false);
    scrollToMessage(msgId);
  };

  const handleToggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabledState(next);
    setNotificationSoundEnabled(next);
    if (next) playMentionChime();
  };

  const handleRequestBrowserPerm = async () => {
    const perm = await requestBrowserNotificationPermission();
    if (perm === 'granted') {
      showBrowserNotification('Laga Amal Pantos', 'Notifikasi desktop aktif! Anda akan menerima notifikasi saat di-tag.');
    }
  };

  // Filtered animated emotes
  const filteredEmotes = useMemo(() => {
    let list = CURATED_CHAT_EMOTES;
    if (emoteCategoryTab !== 'all') {
      list = list.filter((e) => e.category === emoteCategoryTab);
    }
    if (emoteSearchQuery.trim()) {
      const q = emoteSearchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.label.toLowerCase().includes(q)
      );
    }
    return list;
  }, [emoteCategoryTab, emoteSearchQuery]);

  // Filtered curated GIFs
  const filteredGifs = useMemo(() => {
    return searchChatGifs(gifSearchQuery, gifCategoryTab);
  }, [gifSearchQuery, gifCategoryTab]);

  // Insert animated emote code (e.g. :GIGACHAD:) into input
  const handleInsertEmote = (emoteName: string) => {
    const emoteTag = `:${emoteName}:`;
    if (!inputRef.current) {
      setInputText((prev) => (prev ? `${prev} ${emoteTag} ` : `${emoteTag} `));
      return;
    }
    const cursorPos = inputRef.current.selectionStart || inputText.length;
    const before = inputText.slice(0, cursorPos);
    const after = inputText.slice(cursorPos);
    const updated = `${before}${before.endsWith(' ') || !before ? '' : ' '}${emoteTag} ${after}`;
    setInputText(updated);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const nextPos = cursorPos + emoteTag.length + 2;
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 20);
  };

  // Send GIF directly
  const handleSendGif = async (gifUrlToSend: string) => {
    if (!session || !session.isLoggedIn) {
      openLogin();
      return;
    }
    if (!gifUrlToSend.trim()) return;

    const caption = inputText.trim();
    setInputText('');
    setCustomGifUrl('');
    setShouldAutoScroll(true);
    setIsGifPickerOpen(false);

    await sendChatMessage({
      senderName: session.playerName,
      senderAvatar: session.avatar_url,
      senderTier: session.tier,
      senderJulukan: session.julukan,
      content: caption || '',
      gifUrl: gifUrlToSend.trim(),
      ...(replyingTo && {
        replyTo: {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content.slice(0, 150),
        },
      }),
    });

    setReplyingTo(null);
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

  // Detect if message contains only animated emotes (for enlarged display)
  const isMessageOnlyEmotes = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return false;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length > 4) return false;
    return tokens.every((token) => {
      const clean = token.startsWith(':') && token.endsWith(':') && token.length > 2
        ? token.slice(1, -1)
        : token;
      return EMOTE_NAME_MAP.has(clean.toUpperCase());
    });
  };

  // Render message text with highlighted @mentions AND animated 7TV/BTTV emotes + GIF support
  const renderMessageContent = (content: string, gifUrl?: string) => {
    const onlyEmotes = isMessageOnlyEmotes(content);

    // Split content by whitespace or @mentions or :emote_code:
    const tokens = content.split(/(\s+|@[a-zA-Z0-9_.-]+|:[a-zA-Z0-9_.-]+:)/g);

    const renderedTokens = tokens.map((token, idx) => {
      if (!token) return null;

      // Mentions
      if (token.startsWith('@') && token.length > 1) {
        const mentioned = token.slice(1);
        const isMentioningMe = session?.playerName.toLowerCase() === mentioned.toLowerCase();
        return (
          <span
            key={`mention-${idx}`}
            className={`inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md text-xs font-bold transition-all shadow-sm ${
              isMentioningMe
                ? 'bg-[#E8B33D] text-[#161311] font-black ring-2 ring-[#F3C256] shadow-md'
                : 'bg-[#E8B33D]/25 text-[#FFD666] border border-[#E8B33D]/60 font-semibold'
            }`}
          >
            @{mentioned}
          </span>
        );
      }

      // Check if token is an emote code (e.g. :GIGACHAD: or GIGACHAD)
      const cleanToken = token.startsWith(':') && token.endsWith(':') && token.length > 2
        ? token.slice(1, -1)
        : token.trim();
      const emote = EMOTE_NAME_MAP.get(cleanToken.toUpperCase());

      if (emote) {
        return (
          <span
            key={`emote-${idx}`}
            className="inline-flex items-center align-middle mx-0.5"
            title={`${emote.name} (${emote.label})`}
          >
            <img
              src={emote.url}
              alt={emote.name}
              className={`${
                onlyEmotes ? 'h-12 w-12 sm:h-14 sm:w-14 my-1' : 'h-7 w-7 sm:h-8 sm:w-8'
              } object-contain transition-transform hover:scale-125 inline-block`}
              loading="lazy"
            />
          </span>
        );
      }

      return <span key={`text-${idx}`}>{token}</span>;
    });

    return (
      <div className="flex flex-col gap-2">
        {content && <div className="whitespace-pre-wrap break-words">{renderedTokens}</div>}
        {gifUrl && (
          <div className="relative group/gif overflow-hidden rounded-xl border border-[#3D352E] bg-black/40 max-w-sm mt-1 shadow-md">
            <img
              src={gifUrl}
              alt="GIF animation"
              className="w-full max-h-64 object-cover sm:object-contain rounded-xl transition-transform duration-300 group-hover/gif:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] font-black text-[#E8B33D] tracking-wider border border-[#E8B33D]/30 backdrop-blur-xs">
              GIF
            </div>
          </div>
        )}
      </div>
    );
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

        {/* Topbar Actions: Git Sync, Notifications & Player Session Controls */}
        <div className="flex items-center gap-2">
          {/* Notification Bell for Player Mentions */}
          {session && (
            <div className="relative">
              <button
                id="chat-notification-bell-btn"
                type="button"
                onClick={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)}
                className={`relative flex items-center justify-center h-8 w-8 rounded-xl border transition-all cursor-pointer ${
                  isNotificationDrawerOpen
                    ? 'bg-[#E8B33D] text-[#161311] border-[#E8B33D]'
                    : unreadMentionsCount > 0
                    ? 'bg-[#E8B33D]/15 text-[#E8B33D] border-[#E8B33D]/40 hover:bg-[#E8B33D]/25'
                    : 'bg-[#241F1B] hover:bg-[#2D2520] text-[#9C948A] hover:text-[#F2EDE4] border-[#332C25]'
                }`}
                title={`Notifikasi Sebutan (@) - ${unreadMentionsCount} belum dibaca`}
              >
                {unreadMentionsCount > 0 ? (
                  <BellRing size={15} className="animate-bounce" />
                ) : (
                  <Bell size={15} />
                )}

                {/* Badge Count */}
                {unreadMentionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-sm ring-1 ring-[#161311]">
                    {unreadMentionsCount > 9 ? '9+' : unreadMentionsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <PlayerAccountMenu />
        </div>
      </div>

      {/* 1.1 NOTIFICATION DRAWER / POPOVER FOR @MENTIONS */}
      {isNotificationDrawerOpen && session && (
        <div
          ref={notificationDrawerRef}
          className="absolute top-14 right-3 sm:right-4 z-40 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#1C1714] border-2 border-[#E8B33D]/60 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#241F1B] border-b border-[#332C25]">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#E8B33D]" />
              <h4 className="font-bold text-sm text-[#F2EDE4]">Notifikasi Tag & Sebutan</h4>
              {unreadMentionsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-500 text-white shadow-sm">
                  {unreadMentionsCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  isSoundEnabled
                    ? 'bg-[#E8B33D]/15 text-[#E8B33D] border-[#E8B33D]/30'
                    : 'bg-[#191513] text-[#7A7268] border-[#332C25]'
                }`}
                title={isSoundEnabled ? 'Suara Notifikasi: Aktif' : 'Suara Notifikasi: Nonaktif'}
              >
                {isSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2D241E] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick actions bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#191513] border-b border-[#332C25]/60 text-[11px]">
            <button
              type="button"
              onClick={handleRequestBrowserPerm}
              className="flex items-center gap-1.5 text-[#E8B33D] hover:underline cursor-pointer font-medium"
            >
              <BellRing size={12} />
              <span>Aktifkan Notifikasi Desktop</span>
            </button>

            {userMentions.length > 0 && unreadMentionsCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllMentionsRead}
                className="flex items-center gap-1 text-[#9C948A] hover:text-[#F2EDE4] cursor-pointer"
              >
                <CheckCheck size={13} className="text-[#E8B33D]" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
          </div>

          {/* Mentions list */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#332C25]/40 p-1">
            {userMentions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#241F1B] border border-[#332C25] text-[#9C948A] mb-2">
                  <AtSign size={18} />
                </div>
                <p className="text-xs font-bold text-[#F2EDE4]">Belum Ada Sebutan</p>
                <p className="text-[11px] text-[#7A7268] mt-1 leading-relaxed">
                  Saat pemain lain mengetik <span className="text-[#E8B33D] font-mono">@{session.playerName}</span> di chat, Anda akan menerima peringatan suara dan tersimpan di sini.
                </p>
              </div>
            ) : (
              userMentions.map((msg) => {
                const isUnread = !readMentionIds.has(msg.id);
                return (
                  <div
                    key={`notif-${msg.id}`}
                    onClick={() => handleJumpToMention(msg.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer ${
                      isUnread
                        ? 'bg-[#282019] hover:bg-[#33281E] border-l-2 border-[#E8B33D]'
                        : 'hover:bg-[#241F1B]'
                    }`}
                  >
                    {/* Avatar */}
                    {msg.senderAvatar ? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="h-8 w-8 rounded-lg object-cover border border-[#332C25] shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2D241C] border border-[#332C25] text-[#E8B33D] font-bold text-xs shrink-0 mt-0.5">
                        {msg.senderName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-[#F2EDE4] truncate">
                            {msg.senderName}
                          </span>
                          {msg.senderTier && (
                            <span className="text-[9px] px-1 rounded bg-[#161311] text-[#E8B33D] border border-[#332C25]">
                              {msg.senderTier}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#6E655C] shrink-0">
                          {formatTime(msg.createdAt, msg.timestamp)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[#C7BEB3] line-clamp-2 leading-relaxed">
                        {msg.content}
                      </p>
                    </div>

                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-[#E8B33D] shrink-0 mt-2 ring-2 ring-[#E8B33D]/30" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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

                  {/* Emote Quick Picker */}
                  {showEmojiPickerFor === msg.id && (
                    <div className="mt-2 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#1D1916] border border-[#3D352E] shadow-xl w-fit">
                      {TOP_EMOTE_REACTIONS.map((emote) => (
                        <button
                          key={`sys-react-${emote.id}`}
                          onClick={() => handleToggleReaction(msg.id, emote.name)}
                          className="p-1 hover:bg-[#241F1B] rounded-lg transition-transform hover:scale-125 cursor-pointer"
                          title={`${emote.name} (${emote.label})`}
                        >
                          <img src={emote.url} alt={emote.name} className="h-5 w-5 object-contain" />
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
                        ? 'bg-[#2E241C] text-[#F5EFE6] border-2 border-[#E8B33D]/60 rounded-tr-none shadow-lg'
                        : 'bg-[#211C18] text-[#F2EDE4] border border-[#332C25] rounded-tl-none'
                    }`}
                  >
                    {/* Replying quote preview if this message is a reply */}
                    {msg.replyTo && (
                      <div
                        onClick={() => scrollToMessage(msg.replyTo!.id)}
                        className={`mb-2 flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer ${
                          isMe
                            ? 'bg-black/35 border-l-2 border-[#E8B33D] text-[#E8E2D9] hover:bg-black/45'
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
                      {renderMessageContent(msg.content, msg.gifUrl)}
                    </div>
                  </div>

                  {/* Reaction & Action Badges */}
                  <div className={`mt-1 flex flex-wrap items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {reactionsList.map((reaction) => {
                      const userHasReacted = session ? reaction.users.includes(session.playerName) : false;
                      const emoteMatch =
                        EMOTE_NAME_MAP.get(reaction.emoji.toUpperCase()) ||
                        EMOTE_NAME_MAP.get(reaction.emoji.replace(/:/g, '').toUpperCase());
                      return (
                        <button
                          key={`react-${msg.id}-${reaction.emoji}`}
                          onClick={() => handleToggleReaction(msg.id, reaction.emoji)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs transition-colors cursor-pointer ${
                            userHasReacted
                              ? 'bg-[#E8B33D]/25 text-[#E8B33D] border border-[#E8B33D]'
                              : 'bg-[#1D1916] text-[#9C948A] border border-[#332C25] hover:border-[#9C948A]'
                          }`}
                          title={`Bereaksi: ${reaction.users.join(', ')}`}
                        >
                          {emoteMatch ? (
                            <img
                              src={emoteMatch.url}
                              alt={emoteMatch.name}
                              className="h-4 w-4 object-contain inline-block"
                            />
                          ) : (
                            <span>{reaction.emoji}</span>
                          )}
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
                      title="Beri Reaksi Emote Bergerak"
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

                  {/* Popover Animated Emote Picker for this message */}
                  {showEmojiPickerFor === msg.id && (
                    <div className="mt-1 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#1D1916] border border-[#3D352E] shadow-2xl z-10 flex-wrap max-w-xs animate-fadeIn">
                      {TOP_EMOTE_REACTIONS.map((emote) => (
                        <button
                          key={`quick-react-${emote.id}`}
                          onClick={() => handleToggleReaction(msg.id, emote.name)}
                          className="p-1 hover:bg-[#241F1B] rounded-lg transition-transform hover:scale-125 cursor-pointer"
                          title={`${emote.name} (${emote.label})`}
                        >
                          <img
                            src={emote.url}
                            alt={emote.name}
                            className="h-6 w-6 object-contain"
                          />
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

      {/* 5. ANIMATED 7TV & BETTERTTV EMOTE PICKER DRAWER */}
      {isInputEmojiPickerOpen && (
        <div
          ref={emojiPickerRef}
          id="chat-emoticon-picker-popup"
          className="absolute bottom-20 right-3 sm:right-6 left-3 sm:left-auto sm:w-[420px] bg-[#1D1916] border border-[#3D352E] rounded-2xl shadow-2xl overflow-hidden z-30 animate-fadeIn flex flex-col max-h-[440px]"
        >
          {/* Header & Categories */}
          <div className="p-3 bg-[#241F1B] border-b border-[#332C25] space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#F2EDE4] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#E8B33D]" />
                  Emotes Bergerak (7TV &amp; BTTV)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8B33D]/20 text-[#E8B33D] font-bold">
                  {filteredEmotes.length + live7tvEmotes.length}
                </span>
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

            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setEmoteCategoryTab('chad')}
                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  emoteCategoryTab === 'chad'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                👑 Chad &amp; MVP
              </button>
              <button
                type="button"
                onClick={() => setEmoteCategoryTab('troll')}
                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  emoteCategoryTab === 'troll'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🤡 Troll &amp; KEKW
              </button>
              <button
                type="button"
                onClick={() => setEmoteCategoryTab('beban')}
                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  emoteCategoryTab === 'beban'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                😭 Beban &amp; Turu
              </button>
              <button
                type="button"
                onClick={() => setEmoteCategoryTab('dance')}
                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  emoteCategoryTab === 'dance'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🎵 Joget &amp; Vibe
              </button>
              <button
                type="button"
                onClick={() => setEmoteCategoryTab('all')}
                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  emoteCategoryTab === 'all'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🌐 Semua
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C948A]" />
              <input
                type="text"
                value={emoteSearchQuery}
                onChange={(e) => setEmoteSearchQuery(e.target.value)}
                placeholder="Cari emote (cth: gigachad, kekw, copium, turu)..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#161311] border border-[#332C25] text-xs text-[#F2EDE4] placeholder-[#6E655C] focus:outline-none focus:border-[#E8B33D]"
              />
              {emoteSearchQuery && (
                <button
                  type="button"
                  onClick={() => setEmoteSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Emote Grid */}
          <div className="p-3 overflow-y-auto flex-1 space-y-3">
            {/* Curated list */}
            <div>
              <div className="text-[10px] font-bold text-[#9C948A] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Emote Pilihan Komunitas</span>
                <span className="text-[9px] text-[#6E655C]">Klik untuk masukkan</span>
              </div>
              {filteredEmotes.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#9C948A]">
                  Tidak ada emote pilihan yang cocok dengan pencarian.
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {filteredEmotes.map((emote) => (
                    <button
                      key={emote.id}
                      type="button"
                      onClick={() => handleInsertEmote(emote.name)}
                      className="group flex flex-col items-center justify-center p-2 rounded-xl bg-[#241F1B] hover:bg-[#2D2520] border border-[#332C25] hover:border-[#E8B33D] transition-all hover:scale-105 cursor-pointer text-center"
                      title={`${emote.name} - ${emote.label}`}
                    >
                      <div className="h-9 w-9 flex items-center justify-center">
                        <img
                          src={emote.url}
                          alt={emote.name}
                          className="h-8 w-8 object-contain transition-transform group-hover:scale-125"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#F2EDE4] truncate max-w-full mt-1">
                        {emote.name}
                      </span>
                      <span className="text-[8px] text-[#9C948A] truncate max-w-full">
                        {emote.source.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Live 7TV Search Results (if user searched) */}
            {emoteSearchQuery.trim().length >= 2 && (
              <div className="pt-2 border-t border-[#332C25]">
                <div className="text-[10px] font-bold text-[#E8B33D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  {isSearching7tv ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Hasil Langsung dari 7TV.app ({live7tvEmotes.length})</span>
                </div>
                {isSearching7tv ? (
                  <div className="text-center py-3 text-xs text-[#9C948A] flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin text-[#E8B33D]" />
                    <span>Mencari di 7TV...</span>
                  </div>
                ) : live7tvEmotes.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {live7tvEmotes.map((emote) => (
                      <button
                        key={`live-${emote.id}`}
                        type="button"
                        onClick={() => handleInsertEmote(emote.name)}
                        className="group flex flex-col items-center justify-center p-2 rounded-xl bg-[#241F1B] hover:bg-[#2D2520] border border-[#332C25] hover:border-[#E8B33D] transition-all hover:scale-105 cursor-pointer text-center"
                        title={emote.name}
                      >
                        <div className="h-9 w-9 flex items-center justify-center">
                          <img
                            src={emote.url}
                            alt={emote.name}
                            className="h-8 w-8 object-contain transition-transform group-hover:scale-125"
                            loading="lazy"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#F2EDE4] truncate max-w-full mt-1">
                          {emote.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-[11px] text-[#6E655C]">
                    Tidak ada emote tambahan di 7TV.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 bg-[#161311] border-t border-[#332C25] text-[10px] text-[#9C948A] flex items-center justify-between shrink-0">
            <span>⚡ Emote bergerak resmi 7tv.app &amp; betterttv.com</span>
            <span className="text-[#E8B33D] font-mono">Animated WebP</span>
          </div>
        </div>
      )}

      {/* 5B. GIF DRAWER (MOBILE LEGENDS & MEME GIFS) */}
      {isGifPickerOpen && (
        <div
          ref={gifPickerRef}
          id="chat-gif-picker-popup"
          className="absolute bottom-20 right-3 sm:right-6 left-3 sm:left-auto sm:w-[440px] bg-[#1D1916] border border-[#3D352E] rounded-2xl shadow-2xl overflow-hidden z-30 animate-fadeIn flex flex-col max-h-[460px]"
        >
          {/* Header */}
          <div className="p-3 bg-[#241F1B] border-b border-[#332C25] space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#E8B33D]/20 text-[#E8B33D]">
                  <Film size={13} />
                </div>
                <span className="text-xs font-black text-[#F2EDE4]">
                  Kirim GIF MLBB &amp; Meme
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8B33D]/20 text-[#E8B33D] font-bold">
                  {filteredGifs.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsGifPickerOpen(false)}
                className="text-[#9C948A] hover:text-[#F2EDE4] p-1 rounded-lg cursor-pointer"
                title="Tutup"
              >
                <X size={15} />
              </button>
            </div>

            {/* GIF Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setGifCategoryTab('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  gifCategoryTab === 'all'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🌟 Semua
              </button>
              <button
                type="button"
                onClick={() => setGifCategoryTab('mlbb')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  gifCategoryTab === 'mlbb'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🎮 MLBB &amp; Game
              </button>
              <button
                type="button"
                onClick={() => setGifCategoryTab('meme')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  gifCategoryTab === 'meme'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                🔥 Meme Keren
              </button>
              <button
                type="button"
                onClick={() => setGifCategoryTab('victory')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  gifCategoryTab === 'victory'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                👑 Selebrasi
              </button>
              <button
                type="button"
                onClick={() => setGifCategoryTab('sad')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  gifCategoryTab === 'sad'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E]'
                }`}
              >
                😭 Pasrah &amp; Turu
              </button>
            </div>

            {/* GIF Search Bar */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C948A]" />
              <input
                type="text"
                value={gifSearchQuery}
                onChange={(e) => setGifSearchQuery(e.target.value)}
                placeholder="Cari GIF MLBB, Chou, Savage, Rage, Mewing..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#161311] border border-[#332C25] text-xs text-[#F2EDE4] placeholder-[#6E655C] focus:outline-none focus:border-[#E8B33D]"
              />
              {gifSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGifSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* GIF Grid */}
          <div className="p-3 overflow-y-auto flex-1 max-h-60">
            {filteredGifs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#9C948A]">
                Tidak ada GIF yang cocok. Silakan coba kata kunci lain atau tempel link URL di bawah.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredGifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => handleSendGif(gif.url)}
                    className="group relative overflow-hidden rounded-xl border border-[#332C25] hover:border-[#E8B33D] bg-black/50 text-left transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <img
                      src={gif.url}
                      alt={gif.title}
                      className="h-28 w-full object-cover rounded-xl"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 opacity-90 group-hover:opacity-100">
                      <span className="text-[10px] font-bold text-white truncate">
                        {gif.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom GIF URL Input */}
          <div className="p-2.5 bg-[#161311] border-t border-[#332C25] shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={customGifUrl}
                onChange={(e) => setCustomGifUrl(e.target.value)}
                placeholder="Atau tempel link URL GIF langsung..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#241F1B] border border-[#332C25] text-xs text-[#F2EDE4] placeholder-[#6E655C] focus:outline-none focus:border-[#E8B33D]"
              />
              <button
                type="button"
                disabled={!customGifUrl.trim()}
                onClick={() => handleSendGif(customGifUrl)}
                className="px-3 py-1.5 rounded-lg bg-[#E8B33D] hover:bg-[#F3C256] text-[#161311] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
              >
                Kirim
              </button>
            </div>
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

              {/* Emoticon 7TV/BTTV Button */}
              <button
                id="chat-emoticon-btn"
                type="button"
                onClick={() => {
                  setIsInputEmojiPickerOpen(!isInputEmojiPickerOpen);
                  setIsGifPickerOpen(false);
                }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  isInputEmojiPickerOpen
                    ? 'bg-[#E8B33D] text-[#161311] border-[#E8B33D]'
                    : 'bg-[#241F1B] hover:bg-[#2D2520] text-[#E8B33D] border-[#332C25]'
                }`}
                title="Buka Emote Bergerak (7TV / BTTV)"
              >
                <Smile size={19} />
              </button>

              {/* GIF Button */}
              <button
                id="chat-gif-btn"
                type="button"
                onClick={() => {
                  setIsGifPickerOpen(!isGifPickerOpen);
                  setIsInputEmojiPickerOpen(false);
                }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  isGifPickerOpen
                    ? 'bg-[#E8B33D] text-[#161311] border-[#E8B33D]'
                    : 'bg-[#241F1B] hover:bg-[#2D2520] text-[#E8B33D] border-[#332C25]'
                }`}
                title="Kirim GIF MLBB & Meme"
              >
                <Film size={18} />
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

      {/* 9. GIT SYNC / GITHUB REPO MODAL */}
      <GitSyncModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        players={players}
        matches={matches}
        seasons={seasons}
        activeSeason={activeSeason || null}
      />

      {/* 10. FLOATING IN-APP MENTION NOTIFICATION TOAST */}
      <MentionNotificationToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
        onOpenChat={(msgId) => {
          scrollToMessage(msgId);
          handleMarkMentionRead(msgId);
        }}
      />
    </div>
  );
};
