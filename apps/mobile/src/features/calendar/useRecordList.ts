import { useEffect, useRef, useState } from 'react';
import type { AppServices } from '../../services';
import type { Entry } from '../../domain/records';
import { copy } from '../../ui/copy';

export function useRecordList(services: AppServices) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true),
    [hasMore, setHasMore] = useState(false),
    [error, setError] = useState('');
  const active = useRef(true),
    lock = useRef(true);
  useEffect(() => {
    active.current = true;
    void services.repository
      .list()
      .then((rows) => {
        if (active.current) {
          setEntries(rows);
          setHasMore(rows.length === 60);
        }
      })
      .catch(() => {
        if (active.current) setError(copy.errors.PROCESSING_FAILED);
      })
      .finally(() => {
        lock.current = false;
        if (active.current) setLoading(false);
      });
    return () => {
      active.current = false;
    };
  }, [services]);
  async function loadMore() {
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    setError('');
    try {
      const rows = await services.repository.list({ offset: entries.length });
      if (active.current) {
        setEntries((current) => [...current, ...rows]);
        setHasMore(rows.length === 60);
      }
    } catch {
      if (active.current) setError(copy.errors.PROCESSING_FAILED);
    } finally {
      lock.current = false;
      if (active.current) setLoading(false);
    }
  }
  return { entries, loading, hasMore, error, loadMore };
}
