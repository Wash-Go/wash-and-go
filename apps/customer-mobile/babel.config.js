module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated v4 uses the worklets plugin; must be last.
    plugins: ['react-native-worklets/plugin'],
  };
};
