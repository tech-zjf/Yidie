const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// A separate development entry keeps fixtures out of normal app bundles and local storage.
if (process.env.YIDIE_UI_PREVIEW === '1') {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (
      context.dev &&
      moduleName === './App' &&
      context.originModulePath === path.join(__dirname, 'index.ts')
    ) {
      return { type: 'sourceFile', filePath: path.join(__dirname, 'src/preview/PreviewRoot.tsx') };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}
module.exports = config;
