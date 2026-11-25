// Explicitly require babel-preset-expo from expo@58's bundled copy,
// NOT from the hoisted root node_modules/babel-preset-expo@12 (expo@52).
// The monorepo root has an old expo@52 install (pulled in as a peer dep of
// react-native-web etc.) which brings babel-preset-expo@12 and
// @react-native/babel-plugin-codegen@0.76.9. That old codegen cannot parse
// new RN 0.88 internal files (VirtualViewNativeComponent.js uses Flow types
// that only codegen 0.88 understands).

const path = require('path');

// Resolve the correct babel-preset-expo from expo@58 which is installed in
// apps/mobile/node_modules/expo/node_modules/babel-preset-expo
const expoPreset = require(
  path.resolve(
    __dirname,
    'node_modules/expo/node_modules/babel-preset-expo'
  )
);

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [expoPreset, { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
