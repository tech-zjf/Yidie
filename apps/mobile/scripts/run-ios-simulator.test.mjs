import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const simulatorId = '11111111-1111-4111-8111-111111111111';
const physicalId = '99999999-9999-4999-8999-999999999999';
const inventory = JSON.stringify({
  devices: {
    'com.apple.CoreSimulator.SimRuntime.iOS-27-0': [
      { name: 'iPhone 18 Pro', udid: simulatorId, isAvailable: true },
    ],
  },
});

function createHarness(t, { failInventory = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'yidie-simulator-launch-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const inventoryPath = join(root, 'inventory.json');
  const invokedPath = join(root, 'expo-args.txt');
  writeFileSync(inventoryPath, inventory);
  const xcrunPath = join(bin, 'xcrun');
  const npxPath = join(bin, 'npx');
  writeFileSync(
    xcrunPath,
    failInventory ? '#!/bin/sh\nexit 1\n' : '#!/bin/sh\ncat "$SIMULATOR_INVENTORY"\n',
  );
  writeFileSync(npxPath, '#!/bin/sh\nprintf \'%s\\n\' "$@" > "$EXPO_ARGS_FILE"\n');
  chmodSync(xcrunPath, 0o755);
  chmodSync(npxPath, 0o755);

  return {
    invokedPath,
    run(...args) {
      return spawnSync(process.execPath, [resolve('scripts/run-ios-simulator.mjs'), ...args], {
        cwd: resolve('.'),
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:/usr/bin:/bin`,
          SIMULATOR_INVENTORY: inventoryPath,
          EXPO_ARGS_FILE: invokedPath,
        },
      });
    },
  };
}

test('Simulator launcher forwards only the validated simulator UDID to Expo', (t) => {
  const harness = createHarness(t);
  const result = harness.run(simulatorId);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(harness.invokedPath, 'utf8'),
    `expo\nrun:ios\n--device\n${simulatorId}\n--configuration\nDebug\n`,
  );
});

test('Release launcher validates the Simulator before forwarding its configuration', (t) => {
  const harness = createHarness(t);
  const result = harness.run('--configuration', 'Release', simulatorId);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(harness.invokedPath, 'utf8'),
    `expo\nrun:ios\n--device\n${simulatorId}\n--configuration\nRelease\n`,
  );
});

test('Simulator launcher rejects unknown configurations and missing device selection', (t) => {
  const harness = createHarness(t);
  assert.equal(harness.run('--configuration', 'Any', simulatorId).status, 2);
  assert.equal(harness.run().status, 2);
  assert.equal(existsSync(harness.invokedPath), false);
});

test('Simulator launcher rejects phone identifiers and names before invoking Expo', (t) => {
  const harness = createHarness(t);
  const physical = harness.run(physicalId);
  assert.equal(physical.status, 2);
  assert.match(physical.stderr, /No device was launched or installed/);
  assert.equal(existsSync(harness.invokedPath), false);

  const name = harness.run('iPhone 18 Pro');
  assert.equal(name.status, 2);
  assert.equal(existsSync(harness.invokedPath), false);
});

test('Simulator launcher fails closed when CoreSimulator inventory is unavailable', (t) => {
  const harness = createHarness(t, { failInventory: true });
  const result = harness.run(simulatorId);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Stopped before invoking Expo/);
  assert.equal(existsSync(harness.invokedPath), false);
});

test('all package launch shortcuts use the Simulator-only validation helper', () => {
  const { scripts } = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.match(scripts.ios, /run-ios-simulator\.mjs/);
  assert.match(scripts['ios:sim'], /run-ios-simulator\.mjs/);
  assert.match(scripts['ios:release'], /run-ios-simulator\.mjs/);
  assert.doesNotMatch(scripts.ios, /expo run:ios/);
  assert.doesNotMatch(scripts['ios:release'], /expo run:ios/);
});
