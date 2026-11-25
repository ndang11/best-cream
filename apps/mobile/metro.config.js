const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// exclusionList is exposed as the default export (CJS compat default)
// from the metro-config bundled within apps/mobile/node_modules/metro-config
const _exclusionListModule = require(
  path.resolve(
    __dirname,
    'node_modules/metro-config/src/defaults/exclusionList.js'
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
//    @react-native/*@0.76.9 packages from being bundled, while keeping
//    hoisted 0.88.1 packages such as @react-native/asset-utils and
//    @react-native/debugger-shell accessible.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const staleRootAtReactNativePackages = [
  'babel-plugin-codegen',
  'babel-preset',
  'codegen',
  'community-cli-plugin',
  'debugger-frontend',
  'dev-middleware',
  'gradle-plugin',
  'js-polyfills',
  'metro-babel-transformer',
  'normalize-colors',
  'virtualized-lists',
];

const blockListPatterns = [
  // Stale root react-native@0.76.9
  new RegExp(
    escapeRegex(path.resolve(monorepoRoot, 'node_modules/react-native')) + '/.*'
  ),
  // Stale root expo@52.x
  new RegExp(
    escapeRegex(path.resolve(monorepoRoot, 'node_modules/expo')) + '/.*'
  ),
  // Stale root babel-preset-expo@12.x (bundled with expo@52)
  new RegExp(
    escapeRegex(path.resolve(monorepoRoot, 'node_modules/babel-preset-expo')) + '/.*'
  ),
  // Stale root @react-native/* packages (0.76.9 versions that shadow 0.88.1)
  ...staleRootAtReactNativePackages.map(
    (pkg) =>
      new RegExp(
        escapeRegex(
          path.resolve(monorepoRoot, 'node_modules/@react-native', pkg)
        ) + '/.*'
      )
  ),
];

config.resolver.blockList = exclusionList(blockListPatterns);

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, 'global.css'),
  configPath: path.resolve(projectRoot, 'tailwind.config.js'),
});
