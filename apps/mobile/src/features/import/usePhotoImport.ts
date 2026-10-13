import { useEffect, useRef, useState } from 'react';
import type { AppServices } from '../../services';
import type { Asset, ImportedPhoto } from '../../domain/records';
import { proposeDate, isRecordDate, type DateProposal } from '../../domain/datePolicy';
import { errorCode } from '../../domain/importPhoto';
import { copy } from '../../ui/copy';

export function usePhotoImport(
  services: AppServices,
  selectedDate: string | undefined,
  onSaved: () => void,
) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [permission, setPermission] = useState(false);
  const [photo, setPhoto] = useState<ImportedPhoto | null>(null),
    [proposal, setProposal] = useState<DateProposal>({ date: null, source: 'unknown' });
  const [date, setDate] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [notice, setNotice] = useState('');
  const lock = useRef(false),
    staged = useRef<ImportedPhoto | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (staged.current) void services.photos.discardImport(staged.current.id).catch(() => {});
    };
  }, [services]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      if (mounted.current) setError(copy.errors[errorCode(e)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const authorize = () =>
    run(async () => {
      const status = await services.photos.requestPermission();
      if (status === 'denied')
        throw Object.assign(new Error(), { code: 'PHOTO_PERMISSION_DENIED' });
      setPermission(true);
      const next = await services.photos.listPhotos(0, 60);
      setAssets(next);
      setHasMore(next.length === 60);
    });
  const loadMore = () =>
    run(async () => {
      const next = await services.photos.listPhotos(assets.length, 60);
      setAssets((old) => [...old, ...next]);
      setHasMore(next.length === 60);
    });
  const choose = (asset: Asset) =>
    run(async () => {
      const imported = await services.photos.importPhoto(asset.id);
      if (!mounted.current) {
        await services.photos.discardImport(imported.id);
        return;
      }
      staged.current = imported;
      const suggested = proposeDate({
        ...imported,
        selectedDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setPhoto(imported);
      setProposal(suggested);
      setDate(suggested.date ?? '');
    });
  const confirm = () =>
    run(async () => {
      if (!photo) return;
      const trimmed = date.trim();
      if (trimmed && !isRecordDate(trimmed)) throw new Error('INVALID_DATE');
      const confirmed: DateProposal =
        trimmed === proposal.date
          ? proposal
          : { date: trimmed || null, source: trimmed ? 'user' : 'unknown' };
      // Ownership transfers to the use case, which handles pre-insert cleanup.
      staged.current = null;
      try {
        await services.actions.import(photo, confirmed);
        if (mounted.current) setNotice(copy.saved);
      } finally {
        setPhoto(null);
        onSaved();
      }
    });
  return {
    assets,
    permission,
    photo,
    proposal,
    date,
    setDate,
    busy,
    error,
    notice,
    hasMore,
    authorize,
    loadMore,
    choose,
    confirm,
  };
}
