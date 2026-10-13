import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { AppServices } from '../../services';
import type { Entry } from '../../domain/records';
import { shiftMonth } from '../../domain/datePolicy';
import { copy } from '../../ui/copy';
export function useCalendar(services: AppServices) {
  const [month, setMonth] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }));
  const [entries, setEntries] = useState<Entry[]>([]),
    [error, setError] = useState('');
  const [day, setDay] = useState<string | null>(null),
    [importDate, setImportDate] = useState<string | null | undefined>(undefined);
  const [showAll, setShowAll] = useState(false);
  const request = useRef({ version: 0 });
  const monthKey = `${month.year}-${String(month.month).padStart(2, '0')}`;
  const refresh = useCallback(() => {
    const id = ++request.current.version;
    return services.repository
      .list({ month: monthKey })
      .then((value) => {
        if (id !== request.current.version) return;
        setEntries(value);
        setError('');
      })
      .catch(() => {
        if (id !== request.current.version) return;
        setError(copy.errors.PROCESSING_FAILED);
      });
  }, [services, monthKey]);
  useEffect(() => {
    const token = request.current;
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      sub.remove();
      token.version++;
    };
  }, [refresh]);
  return {
    month,
    entries,
    error,
    day,
    setDay,
    importDate,
    setImportDate,
    showAll,
    setShowAll,
    refresh,
    changeMonth: (delta: number) =>
      setMonth((current) => shiftMonth(current.year, current.month, delta)),
  };
}
