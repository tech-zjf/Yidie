import { useEffect, useRef, useState } from 'react';
import type { AppServices } from '../../services';
import type { Asset } from '../../domain/records';
import { errorCode } from '../../domain/importPhoto';
import { copy } from '../../ui/copy';

export function usePhotoLibrary(services: AppServices) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [hasMore, setHasMore] = useState(false);
  const active = useRef(true),
    lock = useRef(false),
    offset = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function load(authorize: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (authorize) {
        const status = await services.photos.requestPermission();
        if (status === 'denied') throw new Error('PHOTO_PERMISSION_DENIED');
        if (active.current) setPermission(true);
      }
      const page = await services.photos.listPhotos(offset.current, 60);
      offset.current += page.length;
      if (active.current) {
        setAssets((old) => [
          ...new Map([...old, ...page].map((asset) => [asset.id, asset])).values(),
        ]);
        setHasMore(page.length === 60);
      }
    } catch (error) {
      if (active.current) setError(copy.errors[errorCode(error)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return {
    assets,
    permission,
    busy,
    error,
    hasMore,
    authorize: () => load(true),
    loadMore: () => load(false),
  };
}
