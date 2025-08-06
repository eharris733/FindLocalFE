const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add platform-specific extensions
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Ensure font files are properly handled
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'ttf',
  'otf',
  'woff',
  'woff2'
];

// Add asset plugins for fonts
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;