// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*"],
    rules: {
      // Reanimated shared values use .value = ... by design across worklets and components.
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  }
]);
