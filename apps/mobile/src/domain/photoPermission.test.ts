import assert from 'node:assert/strict';
import test from 'node:test';
import { canReadPhotos, photoPermissionAction } from './photoPermission';

test('photo access requests permission only before the user has decided', () => {
  assert.equal(photoPermissionAction('notDetermined'), 'request');
  assert.equal(photoPermissionAction('denied'), 'openSettings');
  assert.equal(photoPermissionAction('restricted'), 'explainRestriction');
});

test('authorized and limited libraries can be read without another prompt', () => {
  for (const permission of ['authorized', 'limited'] as const) {
    assert.equal(canReadPhotos(permission), true);
    assert.equal(photoPermissionAction(permission), 'showLibrary');
  }

  assert.equal(canReadPhotos('notDetermined'), false);
  assert.equal(canReadPhotos('denied'), false);
  assert.equal(canReadPhotos('restricted'), false);
});
