export interface ChatEmote {
  id: string;
  name: string;
  label: string;
  url: string;
  source: '7tv' | 'bttv';
  category: 'chad' | 'troll' | 'beban' | 'dance' | 'all';
}

/**
 * Curated list of high-quality animated emotes from 7tv.app & betterttv.com
 * Specifically chosen and labeled for Pantos MLBB & gaming community banter.
 */
export const CURATED_CHAT_EMOTES: ChatEmote[] = [
  // 1. CHAD & GGWP (MVP, Gendong, Hype, Respect)
  {
    id: '01F6MZGCNG000255K4X1K7NTHR',
    name: 'GIGACHAD',
    label: 'GIGACHAD (Gendong Tim)',
    url: 'https://cdn.7tv.app/emote/01F6MZGCNG000255K4X1K7NTHR/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01GKCFCXXG0000BEE54GRT497P',
    name: 'sigma',
    label: 'Sigma Mewing (Fokus Win)',
    url: 'https://cdn.7tv.app/emote/01GKCFCXXG0000BEE54GRT497P/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01HF7Y1H400005NHKNXV1F9EF0',
    name: 'mewing',
    label: 'Mewing (Bye Beban)',
    url: 'https://cdn.7tv.app/emote/01HF7Y1H400005NHKNXV1F9EF0/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01F6RD7B88000B4N55W5NS55R7',
    name: 'LETSGO',
    label: 'LETSGO (Meluncur)',
    url: 'https://cdn.7tv.app/emote/01F6RD7B88000B4N55W5NS55R7/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01F78Y0PN00005BGS0Y3M9TD8M',
    name: 'EZClap',
    label: 'EZClap (Gampang Banget)',
    url: 'https://cdn.7tv.app/emote/01F78Y0PN00005BGS0Y3M9TD8M/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01M1AFSA5WQ7FN5P1NQ8Z8JECY',
    name: 'ggez',
    label: 'GGEZ (Good Game Ez)',
    url: 'https://cdn.7tv.app/emote/01M1AFSA5WQ7FN5P1NQ8Z8JECY/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01F6MDFCSR0000WDA7ERT623YT',
    name: 'NODDERS',
    label: 'NODDERS (Setuju Sepuh)',
    url: 'https://cdn.7tv.app/emote/01F6MDFCSR0000WDA7ERT623YT/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01F6NE9AER000CKKT9BSDYGT0J',
    name: 'Clap',
    label: 'Clap (Tepuk Respect)',
    url: 'https://cdn.7tv.app/emote/01F6NE9AER000CKKT9BSDYGT0J/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '01F6NET6G00009JYTB75QDKV1S',
    name: 'peepoClap',
    label: 'peepoClap (GGWP King)',
    url: 'https://cdn.7tv.app/emote/01F6NET6G00009JYTB75QDKV1S/2x.webp',
    source: '7tv',
    category: 'chad',
  },
  {
    id: '566ca38765dbbdab32ec0560',
    name: 'SourPls',
    label: 'SourPls (Joget Menang)',
    url: 'https://cdn.betterttv.net/emote/566ca38765dbbdab32ec0560/2x.webp',
    source: 'bttv',
    category: 'chad',
  },
  {
    id: '5805580c3d506fea7ee357d6',
    name: 'AlienPls',
    label: 'AlienPls (Goyang Santuy)',
    url: 'https://cdn.betterttv.net/emote/5805580c3d506fea7ee357d6/2x.webp',
    source: 'bttv',
    category: 'chad',
  },

  // 2. TROLL & BANTER (Banter, Toxic Lucu, Taunting)
  {
    id: '01FCP0YPQ800037YGEKHNTNXY1',
    name: 'KEKW',
    label: 'KEKW (Ngakak Brutal)',
    url: 'https://cdn.7tv.app/emote/01FCP0YPQ800037YGEKHNTNXY1/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01F6Q76NN80005589X3BDK9CN1',
    name: 'PepeLaugh',
    label: 'PepeLaugh (Ketawa Licik)',
    url: 'https://cdn.7tv.app/emote/01F6Q76NN80005589X3BDK9CN1/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01FPZCP48R0007YCJT9TVEH1MG',
    name: 'ICANT',
    label: 'ICANT (Gak Kuat Ngakak)',
    url: 'https://cdn.7tv.app/emote/01FPZCP48R0007YCJT9TVEH1MG/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01F6VM2YA0000FVMPQTYYN5FRD',
    name: 'OMEGALUL',
    label: 'OMEGALUL (Tertawa Lepas)',
    url: 'https://cdn.7tv.app/emote/01F6VM2YA0000FVMPQTYYN5FRD/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01GSTZ3E08000F54AV8GPAGMNP',
    name: 'SkillIssue',
    label: 'SkillIssue (Skill Issue Bang)',
    url: 'https://cdn.7tv.app/emote/01GSTZ3E08000F54AV8GPAGMNP/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01FMASEDDR0001FS6N1BY0TCBT',
    name: 'CLOWN',
    label: 'Badut Lord (Lord Coklat)',
    url: 'https://cdn.7tv.app/emote/01FMASEDDR0001FS6N1BY0TCBT/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01FKKW7C1G0008TM5NY9QEFEDW',
    name: 'HUH',
    label: 'HUH (Gak Bahaya Ta?)',
    url: 'https://cdn.7tv.app/emote/01FKKW7C1G0008TM5NY9QEFEDW/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01F6BN89H80006VBW12DRB1DJ0',
    name: 'donowall',
    label: 'donowall (Dikacangin Pas War)',
    url: 'https://cdn.7tv.app/emote/01F6BN89H80006VBW12DRB1DJ0/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01F6FTE8B80008E39HFFQJ7MWS',
    name: 'modCheck',
    label: 'modCheck (Mana Temen Tim?)',
    url: 'https://cdn.7tv.app/emote/01F6FTE8B80008E39HFFQJ7MWS/2x.webp',
    source: '7tv',
    category: 'troll',
  },
  {
    id: '01FFWH9WV80000JT8GHDKHJNZC',
    name: 'Aware',
    label: 'Aware (Sadar Diri Beban)',
    url: 'https://cdn.7tv.app/emote/01FFWH9WV80000JT8GHDKHJNZC/2x.webp',
    source: '7tv',
    category: 'troll',
  },

  // 3. BEBAN, PASRAH & TURU
  {
    id: '01F6PW2Q180005589X3BDH8408',
    name: 'Sadge',
    label: 'Sadge (Mengsedih Lose Streak)',
    url: 'https://cdn.7tv.app/emote/01F6PW2Q180005589X3BDH8408/2x.webp',
    source: '7tv',
    category: 'beban',
  },
  {
    id: '01F6ME7ADR0000WDA7ERT9H30R',
    name: 'COPIUM',
    label: 'COPIUM (Bisa Comeback Ini)',
    url: 'https://cdn.7tv.app/emote/01F6ME7ADR0000WDA7ERT9H30R/2x.webp',
    source: '7tv',
    category: 'beban',
  },
  {
    id: '01F6Q269TG000A6S4F82DDD49V',
    name: 'Prayge',
    label: 'Prayge (Doa Digendong Sepuh)',
    url: 'https://cdn.7tv.app/emote/01F6Q269TG000A6S4F82DDD49V/2x.webp',
    source: '7tv',
    category: 'beban',
  },
  {
    id: '01F71S8MF0000CGWD8KWAH6S2E',
    name: 'monkaW',
    label: 'monkaW (Panik Kena Gank)',
    url: 'https://cdn.7tv.app/emote/01F71S8MF0000CGWD8KWAH6S2E/2x.webp',
    source: '7tv',
    category: 'beban',
  },
  {
    id: '01F6MKTFTG0009C9ZSNZTFV2ZF',
    name: 'NOOOO',
    label: 'NOOOO (Rata Satu Tim)',
    url: 'https://cdn.7tv.app/emote/01F6MKTFTG0009C9ZSNZTFV2ZF/2x.webp',
    source: '7tv',
    category: 'beban',
  },
  {
    id: '01F8GT60K80003SFZ1R2RVNQ3P',
    name: 'Bedge',
    label: 'Bedge (Capek Cok Turu)',
    url: 'https://cdn.7tv.app/emote/01F8GT60K80003SFZ1R2RVNQ3P/2x.webp',
    source: '7tv',
    category: 'beban',
  },
  {
    id: '01FSKTRJ1R0001Z3WXBKV3716Q',
    name: 'Beerge',
    label: 'Beerge (Main Sambil Ngantuk)',
    url: 'https://cdn.7tv.app/emote/01FSKTRJ1R0001Z3WXBKV3716Q/2x.webp',
    source: '7tv',
    category: 'beban',
  },
  {
    id: '01F6PRW1W8000898NRWSAT8Y98',
    name: 'Cryge',
    label: 'Nangis (Minta Maaf Tim)',
    url: 'https://cdn.7tv.app/emote/01F6PRW1W8000898NRWSAT8Y98/2x.webp',
    source: '7tv',
    category: 'beban',
  },

  // 4. VIBE & DANCE (Santai, Lagu, Joget)
  {
    id: '01F6MQ33FG000FFJ97ZB8MWV52',
    name: 'catJAM',
    label: 'catJAM (Vibe Santai)',
    url: 'https://cdn.7tv.app/emote/01F6MQ33FG000FFJ97ZB8MWV52/2x.webp',
    source: '7tv',
    category: 'dance',
  },
  {
    id: '01F6QV6G8R0000TEKRM6BFG0Z3',
    name: 'ratJAM',
    label: 'ratJAM (Goyang Dangdut)',
    url: 'https://cdn.7tv.app/emote/01F6QV6G8R0000TEKRM6BFG0Z3/2x.webp',
    source: '7tv',
    category: 'dance',
  },
  {
    id: '01EZY967K0000CYST6006V20T8',
    name: 'pepeJAM',
    label: 'pepeJAM (Kena Musik Kemenangan)',
    url: 'https://cdn.7tv.app/emote/01EZY967K0000CYST6006V20T8/2x.webp',
    source: '7tv',
    category: 'dance',
  },
  {
    id: '55a24e1294dd94001ee86b39',
    name: 'RareParrot',
    label: 'RareParrot (Pesta Party)',
    url: 'https://cdn.betterttv.net/emote/55a24e1294dd94001ee86b39/2x.webp',
    source: 'bttv',
    category: 'dance',
  },
  {
    id: '57320689d69badf9131b82c4',
    name: 'headBang',
    label: 'headBang (Headbang War)',
    url: 'https://cdn.betterttv.net/emote/57320689d69badf9131b82c4/2x.webp',
    source: 'bttv',
    category: 'dance',
  },
];

// Quick map for fast lookup by uppercase name
export const EMOTE_NAME_MAP = new Map<string, ChatEmote>();
CURATED_CHAT_EMOTES.forEach((emote) => {
  EMOTE_NAME_MAP.set(emote.name.toUpperCase(), emote);
  // Also index lowercase/aliases
  EMOTE_NAME_MAP.set(emote.name.toLowerCase(), emote);
});

// Top reactions for quick emote reaction popup
export const TOP_EMOTE_REACTIONS = [
  CURATED_CHAT_EMOTES[0], // GIGACHAD
  CURATED_CHAT_EMOTES[11], // KEKW
  CURATED_CHAT_EMOTES[28], // catJAM
  CURATED_CHAT_EMOTES[22], // COPIUM
  CURATED_CHAT_EMOTES[23], // Prayge
  CURATED_CHAT_EMOTES[15], // SkillIssue
  CURATED_CHAT_EMOTES[16], // CLOWN
  CURATED_CHAT_EMOTES[7], // Clap
  CURATED_CHAT_EMOTES[21], // Sadge
  CURATED_CHAT_EMOTES[25], // Bedge
  CURATED_CHAT_EMOTES[3], // LETSGO
  CURATED_CHAT_EMOTES[17], // HUH
];

/**
 * Live search 7TV GraphQL for additional animated emotes
 */
export async function search7tvLiveEmotes(query: string, limit = 16): Promise<ChatEmote[]> {
  if (!query.trim()) return [];
  const q = `query { emotes(query: "${query.trim()}", page: 1, limit: ${limit}, filter: { animated: true }) { items { id name animated } } }`;
  try {
    const res = await fetch('https://7tv.io/v3/gql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    const items = data?.data?.emotes?.items || [];
    return items.map((item: any) => ({
      id: item.id,
      name: item.name,
      label: item.name,
      url: `https://cdn.7tv.app/emote/${item.id}/2x.webp`,
      source: '7tv' as const,
      category: 'all' as const,
    }));
  } catch (err) {
    console.warn('Failed to search 7TV emotes live:', err);
    return [];
  }
}
