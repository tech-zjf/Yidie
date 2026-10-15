export function parseAvailableIosSimulators(json) {
  const inventory = JSON.parse(json);
  const devices = inventory.devices;
  if (!devices || typeof devices !== 'object' || Array.isArray(devices)) {
    throw new Error('INVALID_SIMULATOR_INVENTORY');
  }

  return Object.entries(devices).flatMap(([runtime, runtimeDevices]) => {
    if (!runtime.startsWith('com.apple.CoreSimulator.SimRuntime.iOS-')) return [];
    if (!Array.isArray(runtimeDevices)) throw new Error('INVALID_SIMULATOR_INVENTORY');
    return runtimeDevices
      .filter((device) => device.isAvailable === true && device.name && device.udid)
      .map(({ name, udid, state }) => ({ name, udid, state, runtime }));
  });
}

export function findAvailableIosSimulator(udid, simulators) {
  if (!/^[0-9a-f-]{36}$/i.test(udid)) return undefined;
  return simulators.find((device) => device.udid.toLowerCase() === udid.toLowerCase());
}
