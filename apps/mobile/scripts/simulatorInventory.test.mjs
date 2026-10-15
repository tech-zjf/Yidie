import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAvailableIosSimulator, parseAvailableIosSimulators } from './simulatorInventory.mjs';

const inventory = JSON.stringify({
  devices: {
    'com.apple.CoreSimulator.SimRuntime.iOS-27-0': [
      { name: 'iPhone 18 Pro', udid: '11111111-1111-4111-8111-111111111111', isAvailable: true },
      { name: 'Unavailable', udid: '22222222-2222-4222-8222-222222222222', isAvailable: false },
    ],
    'com.apple.CoreSimulator.SimRuntime.watchOS-27-0': [
      { name: 'Watch', udid: '33333333-3333-4333-8333-333333333333', isAvailable: true },
    ],
  },
});

test('simulator inventory includes only available iOS simulator devices', () => {
  assert.deepEqual(parseAvailableIosSimulators(inventory), [
    {
      name: 'iPhone 18 Pro',
      udid: '11111111-1111-4111-8111-111111111111',
      state: undefined,
      runtime: 'com.apple.CoreSimulator.SimRuntime.iOS-27-0',
    },
  ]);
});

test('device selection requires an exact simulator UDID', () => {
  const devices = parseAvailableIosSimulators(inventory);
  assert.equal(
    findAvailableIosSimulator('11111111-1111-4111-8111-111111111111', devices)?.name,
    'iPhone 18 Pro',
  );
  assert.equal(findAvailableIosSimulator('iPhone 18 Pro', devices), undefined);
  assert.equal(
    findAvailableIosSimulator('22222222-2222-4222-8222-222222222222', devices),
    undefined,
  );
  assert.equal(
    findAvailableIosSimulator('33333333-3333-4333-8333-333333333333', devices),
    undefined,
  );
});

test('malformed simulator inventories fail closed', () => {
  assert.throws(() => parseAvailableIosSimulators('{'), SyntaxError);
  assert.throws(() => parseAvailableIosSimulators('{"devices":[]}'), /INVALID_SIMULATOR_INVENTORY/);
});
