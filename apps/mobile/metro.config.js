const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// exclusionList is exposed as the default export (CJS compat default)
// from the metro-config bundled within apps/mobile/node_modules/metro-config
const _exclusionListModule = require(
  path.resolve(
    __dirname, 'node_modules/metro-config/src/defaults/exclusionList.js'
  )
);
const exclusionList = _exclusionListModule.default || _exclusionListModule;

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Prioritise local node_modules before monorepo root.
//    This ensures apps/mobile/node_modules/react-native (0.88.1) wins over
//    the hoisted root node_modules/react-native (0.76.9).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Block the stale root-level react-native@0.76.9, expo@52.x, and
//    @react-native@0.76.9 packages from being bundled.
//    Metro MUST only use the copies inside apps/mobile/node_modules/.
//    Without this, Metro may accidentally pick up RN 0.76.9 internals (which
//    don't have VirtualViewNativeComponent etc.) causing "file does not exist"
//    warnings and @react-native/babel-plugin-codegen@0.76.9 parse failures.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const blockListPatterns = [
  // Stale root react-native@0.76.9
  new RegExp(
    escapeRegex(path.resolve(monorepoRoot, 'node_modules/react-native')) + '/.*'
  ),
  // Stale root expo@52.x
  new RegExp(
    escapeRegex(path.resolve(monorepoRoot, 'node_modules/expo')) + '/.*'
  ),
  // Stale root @react-native packages (0.76.9 versions)
  new RegExp(
    escapeRegex(path.resolve(monorepoRoot, 'node_modules/@react-native')) + '/.*'
  ),
  // Stale root babel-preset-expo@12.x (bundled with expo@52)
  new RegExp(
    escapeRegex(path.resolve(monorepoRoot, 'node_modules/babel-preset-expo')) + '/.*'
  ),
];

config.resolver.blockList = exclusionList(blockListPatterns);

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, 'global.css'),
  configPath: path.resolve(projectRoot, 'tailwind.config.js'),
});
