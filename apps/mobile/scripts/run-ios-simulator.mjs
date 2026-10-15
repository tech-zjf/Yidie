import { spawnSync } from 'node:child_process';
import { findAvailableIosSimulator, parseAvailableIosSimulators } from './simulatorInventory.mjs';

const usage = `Usage:
  npm run ios:sim -- --list
  npm run ios:sim -- <available-iOS-simulator-UDID>

The command accepts only an exact UDID from the available iOS Simulator inventory.`;

function main(args) {
  const [selection] = args;
  if (selection === '--help' || selection === '-h') {
    console.log(usage);
    return 0;
  }
  if (args.length !== 1) {
    console.error(usage);
    return 2;
  }

  const result = spawnSync('xcrun', ['simctl', 'list', 'devices', '--json', 'available'], {
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) {
    console.error('Could not read the iOS Simulator inventory. Stopped before invoking Expo.');
    return 1;
  }

  let simulators;
  try {
    simulators = parseAvailableIosSimulators(result.stdout);
  } catch {
    console.error('The iOS Simulator inventory was invalid. Stopped before invoking Expo.');
    return 1;
  }

  if (selection === '--list') {
    if (simulators.length === 0) console.log('No available iOS simulators.');
    for (const simulator of simulators) {
      console.log(`${simulator.name}\t${simulator.udid}\t${simulator.state ?? 'unknown state'}`);
    }
    return 0;
  }

  const simulator = findAvailableIosSimulator(selection, simulators);
  if (!simulator) {
    console.error(
      'Choose an available iOS Simulator UDID from --list. No device was launched or installed.',
    );
    console.error(usage);
    return 2;
  }

  const run = spawnSync('npx', ['expo', 'run:ios', '--device', simulator.udid], {
    stdio: 'inherit',
  });
  if (run.error) {
    console.error(`Could not start Expo: ${run.error.message}`);
    return 1;
  }
  return run.status ?? 1;
}

process.exitCode = main(process.argv.slice(2));
