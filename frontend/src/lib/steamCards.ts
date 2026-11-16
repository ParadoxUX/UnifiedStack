import { getJSON, setJSON, getItem, setItem } from './storage';

const CARDS_KEY = 'user_steam_cards';
const BADGES_KEY = 'user_crafted_badges';

export const CARD_TIERS = [
  { name: 'Разведчик сектора', rarity: 'Обычная', color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.25)' },
  { name: 'Хранитель артефакта', rarity: 'Необычная', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.35)' },
  { name: 'Теневой тактик', rarity: 'Редкая', color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.45)' },
  { name: 'Владыка ядра', rarity: 'Эпическая', color: '#f472b6', glow: 'rgba(244, 114, 182, 0.5)' },
  { name: 'Абсолют Сатурна', rarity: 'Голографическая', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.55)' },
];

export interface SteamCard {
  id: string;
  gameId: string;
  gameTitle: string;
  index: number;
  image?: string;
}

export interface CraftedBadge {
  id: string;
  gameId: string;
  gameTitle: string;
  level: number;
  craftedDate: string;
}

export function getCards(): SteamCard[] {
  const raw = getJSON<any[]>(CARDS_KEY, []);
  return raw
    .filter((c) => c && c.id && c.gameId && c.gameTitle)
    .map((c) => ({
      id: c.id,
      gameId: c.gameId,
      gameTitle: c.gameTitle,
      index: typeof c.index === 'number' ? c.index % 5 : 0,
      image: c.image,
    }));
}

export function getBadges(): CraftedBadge[] {
  const raw = getJSON<any[]>(BADGES_KEY, []);
  return raw.filter((b) => b && b.id && b.gameId && b.gameTitle);
}

export function grantCardsForGame(gameId: string, gameTitle: string, image?: string): number {
  const cards = getCards();
  const existingIndices = cards.filter((c) => c.gameId === gameId).map((c) => c.index);
  const freeIndices = [0, 1, 2, 3, 4].filter((i) => !existingIndices.includes(i));
  const pool = freeIndices.length >= 3 ? freeIndices : [0, 1, 2, 3, 4];

  for (let i = 0; i < 3; i++) {
    const randIdx = pool[Math.floor(Math.random() * pool.length)];
    cards.push({
      id: `card_${Date.now()}_${randIdx}_${Math.random().toString(36).slice(2, 6)}`,
      gameId,
      gameTitle,
      index: randIdx,
      image,
    });
  }
  setJSON(CARDS_KEY, cards);
  return 3;
}

export function openBoosterPack(gameId: string, gameTitle: string, image?: string): { ok: boolean; error?: string } {
  const currentPoints = parseInt(getItem('user_points') || '0', 10) || 0;
  if (currentPoints < 150) {
    return { ok: false, error: 'Недостаточно поинтов (нужно 150 P)' };
  }

  setItem('user_points', String(currentPoints - 150));
  const cards = getCards();
  const existingIndices = new Set(cards.filter((c) => c.gameId === gameId).map((c) => c.index));
  const missing = [0, 1, 2, 3, 4].filter((i) => !existingIndices.has(i));

  for (let i = 0; i < 2; i++) {
    const pick = missing.length > 0
      ? missing.splice(Math.floor(Math.random() * missing.length), 1)[0]
      : Math.floor(Math.random() * 5);

    cards.push({
      id: `booster_${Date.now()}_${pick}_${Math.random().toString(36).slice(2, 6)}`,
      gameId,
      gameTitle,
      index: pick,
      image,
    });
  }
  setJSON(CARDS_KEY, cards);
  return { ok: true };
}

export function sellCardForPoints(cardId: string): number {
  const cards = getCards();
  const filtered = cards.filter((c) => c.id !== cardId);
  if (filtered.length === cards.length) return 0;

  setJSON(CARDS_KEY, filtered);
  const currentPoints = parseInt(getItem('user_points') || '0', 10) || 0;
  const nextPoints = currentPoints + 40;
  setItem('user_points', String(nextPoints));
  return nextPoints;
}

export function getCraftableGames(): { gameId: string; gameTitle: string }[] {
  const cards = getCards();
  const byGame: Record<string, Set<number>> = {};
  const titles: Record<string, string> = {};

  cards.forEach((c) => {
    if (!byGame[c.gameId]) byGame[c.gameId] = new Set();
    byGame[c.gameId].add(c.index);
    titles[c.gameId] = c.gameTitle;
  });

  return Object.keys(byGame)
    .filter((gameId) => byGame[gameId].size >= 5)
    .map((gameId) => ({ gameId, gameTitle: titles[gameId] }));
}

export function craftBadge(gameId: string): boolean {
  const cards = getCards();
  const gameCards = cards.filter((c) => c.gameId === gameId);
  const uniqueIndices = new Set(gameCards.map((c) => c.index));

  if (uniqueIndices.size < 5) return false;

  const gameTitle = gameCards[0].gameTitle;
  // Тратим по 1 карточке каждого из 5 индексов, дубликаты оставляем
  const spentIndices = new Set<number>();
  const remainingCards = cards.filter((c) => {
    if (c.gameId === gameId && !spentIndices.has(c.index)) {
      spentIndices.add(c.index);
      return false;
    }
    return true;
  });
  setJSON(CARDS_KEY, remainingCards);

  const badges = getBadges();
  const existingBadge = badges.find((b) => b.gameId === gameId);
  if (existingBadge) {
    existingBadge.level += 1;
    existingBadge.craftedDate = new Date().toLocaleDateString('ru-RU');
  } else {
    badges.push({
      id: `badge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      gameId,
      gameTitle,
      level: 1,
      craftedDate: new Date().toLocaleDateString('ru-RU'),
    });
  }
  setJSON(BADGES_KEY, badges);

  // Награда за крафт: +250 поинтов
  const currentPoints = parseInt(getItem('user_points') || '0', 10) || 0;
  setItem('user_points', String(currentPoints + 250));
  return true;
}
