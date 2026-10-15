const { withPodfile } = require('@expo/config-plugins');

const POST_INSTALL_CALL = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )`;

const EXPO_SQLITE_HEADER_PATH = `
    # ExpoSQLite's umbrella imports its vendored SQLite header by basename.
    # Add the pod source directory so Swift resolves Expo's exsqlite3 API.
    expo_sqlite = installer.pods_project.targets.find { |target| target.name == 'ExpoSQLite' }
    raise 'ExpoSQLite pod target not found' unless expo_sqlite
    expo_sqlite.build_configurations.each do |build_configuration|
      settings = build_configuration.build_settings
      settings['HEADER_SEARCH_PATHS'] = "#{settings['HEADER_SEARCH_PATHS']} \\\"$(PODS_TARGET_SRCROOT)\\\""
    end`;
const CONFIGURATION_MARKER = "# ExpoSQLite's umbrella imports its vendored SQLite header";

function addExpoSQLiteHeaderSearchPath(contents) {
  if (contents.includes(CONFIGURATION_MARKER)) {
    return contents;
  }

  const callCount = contents.split(POST_INSTALL_CALL).length - 1;
  if (callCount !== 1) {
    throw new Error('Expo Podfile does not contain the expected React Native post-install hook.');
  }

  return contents.replace(POST_INSTALL_CALL, `${POST_INSTALL_CALL}\n${EXPO_SQLITE_HEADER_PATH}`);
}

function withExpoSQLiteHeaderSearchPath(config) {
  return withPodfile(config, (podfileConfig) => {
    podfileConfig.modResults.contents = addExpoSQLiteHeaderSearchPath(
      podfileConfig.modResults.contents,
    );
    return podfileConfig;
  });
}

module.exports = withExpoSQLiteHeaderSearchPath;
module.exports.addExpoSQLiteHeaderSearchPath = addExpoSQLiteHeaderSearchPath;
