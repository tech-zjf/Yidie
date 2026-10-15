export type PhotoPermission = 'notDetermined' | 'authorized' | 'limited' | 'denied' | 'restricted';

export type PhotoPermissionAction =
  'request' | 'openSettings' | 'explainRestriction' | 'showLibrary';

export function photoPermissionAction(permission: PhotoPermission): PhotoPermissionAction {
  switch (permission) {
    case 'notDetermined':
      return 'request';
    case 'denied':
      return 'openSettings';
    case 'restricted':
      return 'explainRestriction';
    case 'authorized':
    case 'limited':
      return 'showLibrary';
  }
}

export function canReadPhotos(permission: PhotoPermission): boolean {
  return permission === 'authorized' || permission === 'limited';
}
