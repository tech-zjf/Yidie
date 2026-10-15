import { useEffect, useRef, useState } from 'react';
import type { AppServices } from '../../services';
import type { Asset, ImportedPhoto } from '../../domain/records';
import { prepareBatch } from '../../domain/prepareBatch';
import {
  batchLimit,
  changeDraftDates,
  toBatchItems,
  type PreparedDraft,
  type PreparationFailure,
} from '../../domain/batchDraft';
import { errorCode } from '../../domain/importPhoto';
import { copy } from '../../ui/copy';

export function useBatchImport(
  services: AppServices,
  selectedDate: string | undefined,
  onSaved: () => void,
) {
  const [selected, setSelected] = useState<Asset[]>([]),
    [drafts, setDrafts] = useState<PreparedDraft[]>([]);
  const [failures, setFailures] = useState<PreparationFailure[]>([]);
  const [stage, setStage] = useState<'select' | 'review' | 'submitted'>('select');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [progress, setProgress] = useState('');
  const [submittedCount, setSubmittedCount] = useState(0);
  const cancelReading = useRef(false);
  const active = useRef(true),
    lock = useRef(false),
    staged = useRef<ImportedPhoto[]>([]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      void services.actions.discardDrafts(staged.current);
      staged.current = [];
    };
  }, [services]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      if (active.current) setError(copy.errors[errorCode(error)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      lock.current = false;
      if (active.current) {
        setBusy(false);
        setProgress('');
      }
    }
  }
  function toggle(asset: Asset) {
    if (lock.current) return;
    if (selected.some((item) => item.id === asset.id))
      setSelected(selected.filter((item) => item.id !== asset.id));
    else if (selected.length < batchLimit) setSelected([...selected, asset]);
    else setError(copy.batch.limit(batchLimit));
  }
  async function prepareAssets(assets: Asset[], existing: PreparedDraft[]) {
    cancelReading.current = false;
    const result = await prepareBatch(
      assets,
      existing,
      {
        source: services.photos,
        repository: services.repository,
        retain: (photo) => {
          staged.current.push(photo);
        },
        release: async (photo) => {
          await services.actions.discardDrafts([photo]);
          staged.current = staged.current.filter((item) => item.id !== photo.id);
        },
      },
      {
        selectedDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isCancelled: () => !active.current || cancelReading.current,
        onProgress: (current, total) => {
          if (active.current) setProgress(copy.batch.preparing(current, total));
        },
      },
    );
    if (active.current) {
      setDrafts(result.drafts);
      setFailures(result.failures);
      setStage('review');
    }
  }
  const prepare = () => run(() => prepareAssets(selected, []));
  const retryReading = () =>
    run(() =>
      prepareAssets(
        failures.map((item) => item.asset),
        drafts,
      ),
    );
  const remove = (id: string) => {
    if (lock.current) return;
    const photo = staged.current.find((item) => item.id === id);
    staged.current = staged.current.filter((item) => item.id !== id);
    setDrafts(drafts.filter((draft) => draft.photo.id !== id));
    if (photo) void services.actions.discardDrafts([photo]);
  };
  function changeDates(ids: string[], value: string): boolean {
    if (lock.current) return false;
    try {
      setDrafts(changeDraftDates(drafts, ids, value));
      setError('');
      return true;
    } catch (error) {
      setError(copy.errors[errorCode(error)] ?? copy.errors.INVALID_DATE);
      return false;
    }
  }
  const confirm = () =>
    run(async () => {
      const items = toBatchItems(drafts);
      if (!items.length) throw new Error('EMPTY_BATCH');
      // The submit operation owns these files until its DB transaction settles.
      const owned = staged.current;
      staged.current = [];
      try {
        await services.actions.submitBatch(items);
      } catch (error) {
        if (active.current) {
          staged.current = owned;
          if (errorCode(error) === 'DUPLICATE_REVIEW') {
            const refreshed: PreparedDraft[] = [];
            for (const draft of drafts) {
              const duplicate = await services.repository.findDuplicate(draft.photo);
              refreshed.push(
                duplicate && !draft.duplicate ? { ...draft, duplicate, include: false } : draft,
              );
            }
            if (active.current) setDrafts(refreshed);
          }
        } else await services.actions.discardDrafts(owned);
        throw error;
      }
      const included = new Set(items.map((item) => item.photo.id));
      void services.actions.discardDrafts(owned.filter((photo) => !included.has(photo.id)));
      if (active.current) {
        setSubmittedCount(items.length);
        setDrafts([]);
        setStage('submitted');
      }
      onSaved();
    });
  return {
    selected,
    drafts,
    failures,
    stage,
    busy,
    error,
    progress,
    submittedCount,
    toggle,
    stopReading: () => {
      cancelReading.current = true;
    },
    prepare,
    retryReading,
    remove,
    changeDates,
    confirm,
    toggleDuplicate: (id: string) => {
      if (lock.current) return;
      setDrafts((current) =>
        current.map((draft) =>
          draft.photo.id === id ? { ...draft, include: !draft.include } : draft,
        ),
      );
    },
  };
}
