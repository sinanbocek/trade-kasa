// ====================================================================
// İŞLEM GEÇMİŞİ — localStorage (kullanıcı "Kaydet" dediğinde eklenir)
// Sadece risk/hacim eğilimini küçük grafiklerle göstermek içindir.
// ====================================================================
import type { Direction, MarketKey } from '../types';

export interface TradeHistoryEntry {
  id: string;
  ts: number;
  market: MarketKey;
  direction: Direction;
  price: number;
  stop: number;
  tp: number | null;
  qty: number;
  volumeNative: number;
  riskPctTotal: number;
  exposurePctTotal: number;
  rr: number | null;
}

const STORAGE_KEY = 'tky_history_v1';
const MAX_ENTRIES = 200;

export function loadHistory(): TradeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: TradeHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* yut — localStorage kapalı olabilir */
  }
}

export function saveHistoryEntry(entry: Omit<TradeHistoryEntry, 'id' | 'ts'>): TradeHistoryEntry[] {
  const all = loadHistory();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const next: TradeHistoryEntry = { ...entry, id, ts: Date.now() };
  const updated = [...all, next].slice(-MAX_ENTRIES);
  persist(updated);
  return updated;
}

export function clearHistory(): TradeHistoryEntry[] {
  persist([]);
  return [];
}

export function historyForMarket(all: TradeHistoryEntry[], market: MarketKey, limit = 20): TradeHistoryEntry[] {
  return all.filter((e) => e.market === market).slice(-limit);
}
