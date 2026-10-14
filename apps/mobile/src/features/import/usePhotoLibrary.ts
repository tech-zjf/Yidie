import { useEffect, useRef, useState } from 'react';
import type { AppServices } from '../../services';
import type { Asset } from '../../domain/records';
import { errorCode } from '../../domain/importPhoto';
import { copy } from '../../ui/copy';

export function usePhotoLibrary(services: AppServices) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [permission, setPermission] = useState(false),
    [limited, setLimited] = useState(false);
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
        if (active.current) {
          setPermission(true);
          setLimited(status === 'limited');
        }
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
    limited,
    busy,
    error,
    hasMore,
    authorize: () => load(true),
    loadMore: () => load(false),
    manageAccess: async () => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        await services.photos.presentLimitedLibraryPicker();
        const status = services.photos.permissionStatus();
        if (active.current) {
          setPermission(status !== 'denied');
          setLimited(status === 'limited');
          setAssets([]);
          setHasMore(false);
          offset.current = 0;
        }
        if (status !== 'denied') {
          const page = await services.photos.listPhotos(0, 60);
          offset.current = page.length;
          if (active.current) {
            setAssets(page);
            setHasMore(page.length === 60);
          }
        }
      } catch (error) {
        if (active.current)
          setError(copy.errors[errorCode(error)] ?? copy.errors.PROCESSING_FAILED);
      } finally {
        lock.current = false;
        if (active.current) setBusy(false);
      }
    },
  };
}
