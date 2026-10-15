const assert = require('node:assert/strict');
const test = require('node:test');

const { addExpoSQLiteHeaderSearchPath } = require('./with-expo-sqlite-header-search-path');

const podfile = `  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end`;

test('adds the vendored SQLite header directory to the ExpoSQLite pod target once', () => {
  const configured = addExpoSQLiteHeaderSearchPath(podfile);

  assert.match(configured, /settings\['HEADER_SEARCH_PATHS'\].*PODS_TARGET_SRCROOT/);
  assert.equal(addExpoSQLiteHeaderSearchPath(configured), configured);
});

test('fails clearly when Expo changes the generated post-install contract', () => {
  assert.throws(
    () => addExpoSQLiteHeaderSearchPath('  post_install do |installer|\n  end'),
    /expected React Native post-install hook/,
  );
});
