import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry } from '../../domain/records';
import { isRecordDate } from '../../domain/datePolicy';
import { errorCode } from '../../domain/importPhoto';
import type { AppServices } from '../../services';
import { copy } from '../../ui/copy';

export function useEntryEditor(
  initial: Entry,
  services: AppServices,
  onChanged: () => void,
  onClose: () => void,
) {
  const [entry, setEntry] = useState(initial);
  const [date, setDate] = useState(initial.date ?? '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [deleted, setDeleted] = useState(false);
  const active = useRef(true),
    lock = useRef(false),
    readVersion = useRef({ value: 0 });
  useEffect(() => {
    const reads = readVersion.current;
    active.current = true;
    return () => {
      active.current = false;
      reads.value++;
    };
  }, []);
  const reload = useCallback(
    async (resetDate: boolean) => {
      const request = ++readVersion.current.value;
      const current = await services.repository.get(initial.id);
      if (active.current && request === readVersion.current.value && current) {
        setEntry(current);
        if (resetDate) setDate(current.date ?? '');
      }
      return current;
    },
    [services, initial.id],
  );
  useEffect(() => {
    async function refreshState() {
      try {
        await reload(false);
      } catch {
        // Retain the visible entry; explicit actions surface their own errors.
      }
    }
    void refreshState();
    return services.actions.queue.subscribe(() => {
      void refreshState();
    });
  }, [services, reload]);
  async function run(action: () => Promise<void>, resetAfterSuccess = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    let resetDate = resetAfterSuccess;
    try {
      await action();
    } catch (cause) {
      resetDate = errorCode(cause) === 'STALE_RESULT';
      if (active.current) setError(copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      // Also refresh after a failed attempt: the DB now contains its failure or newer revision.
      try {
        await reload(resetDate);
      } catch {
        // Preserve the operation result; a later visit will reload from SQLite.
      }
      onChanged();
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return {
    entry,
    date,
    setDate,
    busy,
    error,
    notice,
    deleted,
    saveDate: () =>
      run(async () => {
        const next = date.trim();
        if (next && !isRecordDate(next)) throw new Error('INVALID_DATE');
        await services.repository.changeDate(entry.id, entry.revision, next || null);
        if (active.current) setNotice(copy.dateSaved);
      }, true),
    setCover: () =>
      run(async () => {
        await services.repository.setCover(entry.id, entry.revision);
        if (active.current) setNotice(copy.coverSaved);
      }),
    retry: () =>
      run(async () => {
        await services.actions.retry(entry.id, entry.revision);
        if (active.current) setNotice(copy.retrySaved);
      }),
    remove: () =>
      run(async () => {
        const result = await services.actions.remove(entry.id, entry.revision);
        if (!active.current) return;
        setDeleted(true);
        if (result.filesRemoved) onClose();
        else {
          // The record is deleted; show the cleanup state before the user leaves this editor.
          setNotice(copy.cleanupPending);
        }
      }),
  };
}
