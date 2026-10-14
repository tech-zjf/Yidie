import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppServices } from '../../services';
import type { Entry } from '../../domain/records';
import { copy } from '../../ui/copy';

export function useRecordList(services: AppServices) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true),
    [hasMore, setHasMore] = useState(false),
    [error, setError] = useState('');
  const requests = useRef({ version: 0, busy: false, active: true, refreshPending: false });
  const visible = useRef<Entry[]>([]),
    updateVersion = useRef(0);
  const refreshVisible = useCallback(async () => {
    const state = requests.current;
    // A queue event during pagination must refresh the new page after its read settles.
    if (state.busy) {
      state.refreshPending = true;
      return;
    }
    const request = ++updateVersion.current,
      pageVersion = state.version;
    const ids = visible.current.map((entry) => entry.id);
    if (!ids.length) return;
    try {
      const rows = await services.repository.getMany(ids);
      if (!state.active || request !== updateVersion.current || pageVersion !== state.version)
        return;
      const updates = new Map(rows.map((row) => [row.id, row]));
      const queried = new Set(ids);
      const next = visible.current.flatMap((row) => {
        if (!queried.has(row.id)) return [row];
        const updated = updates.get(row.id);
        return updated ? [updated] : [];
      });
      visible.current = next;
      setEntries(next);
    } catch {
      // Keep the loaded page; an explicit refresh still reports read failures.
    }
  }, [services]);
  const loadFirstPage = useCallback(async () => {
    const state = requests.current,
      version = ++state.version;
    state.busy = true;
    const rows = await readFirstPage(services);
    if (version !== state.version) return;
    state.busy = false;
    setLoading(false);
    if (rows) {
      visible.current = rows;
      setEntries(rows);
      setHasMore(rows.length === 60);
      setError('');
    } else setError(copy.errors.PROCESSING_FAILED);
    if (state.refreshPending) {
      state.refreshPending = false;
      void refreshVisible();
    }
  }, [services, refreshVisible]);
  useEffect(() => {
    const state = requests.current;
    state.active = true;
    // Subscribe before reading so a result arriving during the first page is not lost.
    const unsubscribe = services.actions.queue.subscribe(() => {
      void refreshVisible();
    });
    // Initial SQLite synchronization: all setters run after readFirstPage's awaited I/O.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFirstPage();
    return () => {
      state.version++;
      state.active = false;
      unsubscribe();
    };
  }, [loadFirstPage, refreshVisible, services]);
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
        before: { date: last.date, sortKey: last.sortKey, id: last.id },
      });
      if (version === state.version) {
        visible.current = [...visible.current, ...rows];
        setEntries(visible.current);
        setHasMore(rows.length === 60);
      }
    } catch {
      if (version === state.version) setError(copy.errors.PROCESSING_FAILED);
    } finally {
      if (version === state.version) {
        state.busy = false;
        setLoading(false);
        if (state.refreshPending) {
          state.refreshPending = false;
          void refreshVisible();
        }
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
