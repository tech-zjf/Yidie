import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppServices } from '../../services';
import type { Entry } from '../../domain/records';
import { copy } from '../../ui/copy';

export function useRecordList(services: AppServices) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true),
    [hasMore, setHasMore] = useState(false),
    [error, setError] = useState('');
  const requests = useRef({ version: 0, busy: false, active: true });
  const loadFirstPage = useCallback(() => {
    const state = requests.current,
      version = ++state.version;
    state.busy = true;
    return readFirstPage(services).then((rows) => {
      if (version !== state.version) return;
      state.busy = false;
      setLoading(false);
      if (rows) {
        setEntries(rows);
        setHasMore(rows.length === 60);
        setError('');
      } else setError(copy.errors.PROCESSING_FAILED);
    });
  }, [services]);
  useEffect(() => {
    const state = requests.current;
    state.active = true;
    void loadFirstPage();
    return () => {
      state.version++;
      state.active = false;
    };
  }, [loadFirstPage]);
  function refresh() {
    if (!requests.current.active) return;
    setLoading(true);
    setError('');
    return loadFirstPage();
  }
  async function loadMore() {
    const state = requests.current;
    if (state.busy) return;
    if (!entries.length) return refresh();
    const version = state.version,
      last = entries[entries.length - 1];
    state.busy = true;
    setLoading(true);
    setError('');
    try {
      const rows = await services.repository.list({
        before: { sortKey: last.sortKey, id: last.id },
      });
      if (version === state.version) {
        setEntries((current) => [...current, ...rows]);
        setHasMore(rows.length === 60);
      }
    } catch {
      if (version === state.version) setError(copy.errors.PROCESSING_FAILED);
    } finally {
      if (version === state.version) {
        state.busy = false;
        setLoading(false);
      }
    }
  }
  return { entries, loading, hasMore, error, loadMore, refresh };
}

async function readFirstPage(services: AppServices) {
  try {
    return await services.repository.list();
  } catch {
    return null;
  }
}
