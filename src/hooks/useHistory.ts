import { useCallback, useState } from 'react';
import type { TradeHistoryEntry } from '../lib/history';
import { clearHistory, loadHistory, saveHistoryEntry } from '../lib/history';

export function useHistory() {
  const [entries, setEntries] = useState<TradeHistoryEntry[]>(() => loadHistory());

  const addEntry = useCallback((entry: Omit<TradeHistoryEntry, 'id' | 'ts'>) => {
    setEntries(saveHistoryEntry(entry));
  }, []);

  const clear = useCallback(() => {
    setEntries(clearHistory());
  }, []);

  return { entries, addEntry, clear };
}
