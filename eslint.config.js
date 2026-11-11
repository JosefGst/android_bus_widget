// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'components/generated/*'],
  },
  {
    // Build/config files and scripts run in Node (CommonJS), not in the app bundle.
    files: ['*.config.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', __filename: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' },
    },
  },
  {
    files: ['jest.setup.js'],
    languageOptions: {
      globals: { jest: 'readonly' },
    },
  },
  {
    // Android-only modules are loaded lazily behind a Platform check so the web bundle never imports them.
    files: ['widget-registration.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
