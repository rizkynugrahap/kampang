export interface ChatGifItem {
  id: string;
  title: string;
  url: string;
  category: 'mlbb' | 'meme' | 'victory' | 'sad';
  tags: string[];
}

/**
 * Curated animated GIFs related to Mobile Legends & Gaming banter
 */
export const CURATED_CHAT_GIFS: ChatGifItem[] = [
  // MLBB & Gaming Gameplay / Reactions
  {
    id: 'gif-mlbb-savage',
    title: 'Savage MLBB Moment',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZydW5oOWFzYTRiNnpiNnlhbjM1MHZ4ZWF4NHI0OHkxcTF4OTg3eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgzoKnwFNmISR8I/giphy.gif',
    category: 'mlbb',
    tags: ['savage', 'kill', 'mlbb', 'pro', 'gameplay', 'epic'],
  },
  {
    id: 'gif-gaming-rage',
    title: 'Banting HP / Kena Mental',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGcxcnFqMXdwbnB3bnpxODF4NG52ZnU2OHc2N3lmdG5ubDJnMnBhNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/11tTNkNy1SdXGg/giphy.gif',
    category: 'mlbb',
    tags: ['rage', 'marah', 'lose', 'kalah', 'banting', 'keyboard', 'mental'],
  },
  {
    id: 'gif-mlbb-victory',
    title: 'Victory Selebrasi',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGpmamoxbnAzOXhhdDJwZ2VmdG1uNXAzMmZjcGtzM245d2w4c2hhaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/artj92V8o75VPL7AeQ/giphy.gif',
    category: 'victory',
    tags: ['victory', 'win', 'menang', 'juara', 'champion', 'ggwp'],
  },
  {
    id: 'gif-chou-freestyle',
    title: 'Chou Freestyle Taunting',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3VubndmNHptOHpsNHo3a3B3a3AzZnBhMmN4MmZ4NWdhaTRsOGdlayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7btUg31RGoEZ29TW/giphy.gif',
    category: 'mlbb',
    tags: ['chou', 'taunting', 'tp-tp', 'freestyle', 'recall', 'sombong'],
  },
  {
    id: 'gif-popcat',
    title: 'Popcat Nyam-Nyam',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnN3aDFpNjZ0MHl4dndidGtvNmZ3dGNndDFpOWZ4aTBmNHR1OHM5NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ZeB5RzwVUoxWg2E2gL/giphy.gif',
    category: 'meme',
    tags: ['popcat', 'kucing', 'meme', 'lucu', 'nyam'],
  },
  {
    id: 'gif-cat-nodding',
    title: 'Kucing Joget Vibing',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWc4MWtrdWU5bWh2ZXc5c242OG0waW83NGZldzJ5Mnpra2Y3cDF4NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jpbnoe3UIa8TU8LM13/giphy.gif',
    category: 'meme',
    tags: ['cat', 'vibing', 'joget', 'santai', 'kucing', 'musik'],
  },
  {
    id: 'gif-gigachad',
    title: 'GigaChad Smile',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2s5cDJxcnRhbmt6YjNwbWV5eGNhYTh1NmU1dnVzZ3pxYnp2bzZ5ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CAYVZA5NRb529kKQUc/giphy.gif',
    category: 'victory',
    tags: ['chad', 'gigachad', 'sigma', 'mewing', 'tampan', 'gendong'],
  },
  {
    id: 'gif-dicaprio-cheers',
    title: 'Cheers Great Gatsby Respect',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTV2azhpNGl3enBvZXBnZXgxc3Z6ZzVyMTl2bGVud2s2OG44c3c3aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BPJmthQ3YRwD6QqcVD/giphy.gif',
    category: 'victory',
    tags: ['cheers', 'respect', 'selamat', 'mantap', 'wine', 'gg'],
  },
  {
    id: 'gif-shaq-shimmy',
    title: 'Shaq Joget Bahagia',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3pjdWc3a2k3N3lreXRrMjJjMXVubXlsNHJydmVrdjY5Zmp6Y3IwaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UO5elnTqo4vSg/giphy.gif',
    category: 'victory',
    tags: ['shaq', 'shimmy', 'dance', 'goyang', 'senang', 'party'],
  },
  {
    id: 'gif-facepalm',
    title: 'Facepalm / Salah Pick Hero',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjJ2NWh1cWFlcGp0OHdycW12b3V3OHgyMmZ2MXZ6dmV2Mm5wbGkyZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6yRVg0HWzgS88/giphy.gif',
    category: 'sad',
    tags: ['facepalm', 'tepok jidat', 'beban', 'salah pick', 'pusing', 'capek'],
  },
  {
    id: 'gif-crying-cat',
    title: 'Kucing Nangis Pasrah',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDV6OTJwdzR6Ym05OG53dnF3cnR1OHp4NDl4NWV6Z3ZndmF3aGF6bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/L95W4wv8nnb9K/giphy.gif',
    category: 'sad',
    tags: ['nangis', 'sedih', 'cry', 'kucing', 'pasrah', 'ampun'],
  },
  {
    id: 'gif-sleeping-bedge',
    title: 'Turu Pulas / Capek Main',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3B4ZXA1czFvaTVxYTZ6ZTV3NXlmdmZ2a3VycHlqOXk3aGFicWhscCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/mkhMTALSJY328/giphy.gif',
    category: 'sad',
    tags: ['turu', 'tidur', 'sleep', 'bedge', 'ngantuk', 'capek'],
  },
  {
    id: 'gif-dance-coffin',
    title: 'Coffin Dance Tim Rata',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R4eTFtOHR1aWV2NW85bTV5YjE1OWZ0Mm93bXpsdnFjcm1vMnNlYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Wr2747CnxwBSqyK6xt/giphy.gif',
    category: 'meme',
    tags: ['coffin', 'dance', 'mati', 'rata', 'wipeout', 'rip'],
  },
  {
    id: 'gif-drake-hotline',
    title: 'Drake Tolak & Setuju',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3Q4Y3hjcHBmbmpoOXQ4ZXA2N3V3bnp4cDV1OGJpdWtwZTZ3MWhjbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/111ebonMs90YLu/giphy.gif',
    category: 'meme',
    tags: ['drake', 'yes', 'no', 'setuju', 'tolak', 'meme'],
  },
  {
    id: 'gif-clown-circus',
    title: 'Badut Sirkus Coklat',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTBwczl5cWhhOTExdWp4aWtrNXpnNW5sM2I4N2IxdW00NDd2bWkyNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xxLszVeawO8zS/giphy.gif',
    category: 'meme',
    tags: ['clown', 'badut', 'lucu', 'troll', 'sirkus', 'coklat'],
  },
];

/**
 * Filter curated GIFs by query string
 */
export function searchChatGifs(query: string, category?: string): ChatGifItem[] {
  let list = CURATED_CHAT_GIFS;
  if (category && category !== 'all') {
    list = list.filter((g) => g.category === category);
  }
  if (!query.trim()) return list;
  const q = query.toLowerCase().trim();
  return list.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}
