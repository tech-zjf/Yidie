import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import type { AppServices } from '../../services';
import type { Asset } from '../../domain/records';
import { canReadPhotos, type PhotoPermission } from '../../domain/photoPermission';
import { errorCode } from '../../domain/importPhoto';
import { copy } from '../../ui/copy';

const pageSize = 60;

export function usePhotoLibrary(services: AppServices) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [permission, setPermission] = useState(() => services.photos.permissionStatus());
  const [busy, setBusy] = useState(() => canReadPhotos(services.photos.permissionStatus()));
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const active = useRef(true);
  const lock = useRef(false);
  const offset = useRef(0);
  const permissionRef = useRef(permission);

  const updatePermission = useCallback((next: PhotoPermission) => {
    if (!active.current) return;
    permissionRef.current = next;
    setPermission(next);
    if (!canReadPhotos(next)) {
      offset.current = 0;
      setAssets([]);
      setHasMore(false);
    }
  }, []);

  const load = useCallback(
    async ({ request = false, reset = false }: { request?: boolean; reset?: boolean } = {}) => {
      if (!active.current || lock.current) return;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        const status = request
          ? await services.photos.requestPermission()
          : services.photos.permissionStatus();
        if (!active.current) return;
        updatePermission(status);
        if (!canReadPhotos(status)) return;

        const start = reset ? 0 : offset.current;
        const page = await services.photos.listPhotos(start, pageSize);
        offset.current = start + page.length;
        if (active.current) {
          setAssets((existing) =>
            reset
              ? page
              : [...new Map([...existing, ...page].map((asset) => [asset.id, asset])).values()],
          );
          setHasMore(page.length === pageSize);
        }
      } catch (cause) {
        if (active.current)
          setError(copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED);
      } finally {
        lock.current = false;
        if (active.current) setBusy(false);
      }
    },
    [services.photos, updatePermission],
  );

  useEffect(() => {
    active.current = true;
    if (canReadPhotos(permissionRef.current)) void load({ reset: true });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load({ reset: true });
    });
    return () => {
      active.current = false;
      subscription.remove();
    };
  }, [load]);

  const manageAccess = useCallback(async () => {
    if (lock.current || permissionRef.current !== 'limited') return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await services.photos.presentLimitedLibraryPicker();
      if (!active.current) return;
      const status = services.photos.permissionStatus();
      updatePermission(status);
      if (canReadPhotos(status)) {
        const page = await services.photos.listPhotos(0, pageSize);
        offset.current = page.length;
        if (active.current) {
          setAssets(page);
          setHasMore(page.length === pageSize);
        }
      }
    } catch (cause) {
      if (active.current) setError(copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }, [services.photos, updatePermission]);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      if (active.current) setError(copy.errors.PROCESSING_FAILED);
    }
  }, []);

  return {
    assets,
    permission,
    hasAccess: canReadPhotos(permission),
    limited: permission === 'limited',
    busy,
    error,
    hasMore,
    authorize: () => load({ request: true, reset: true }),
    loadMore: () => load(),
    openSettings,
    manageAccess,
  };
}
