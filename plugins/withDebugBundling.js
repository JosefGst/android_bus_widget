const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * By default the `debug` build variant skips bundling the JS/assets into
 * the APK and instead loads them from a running Metro/Expo dev server at
 * runtime. This forces the debug variant to bundle like `release` does, so
 * a debug APK built in CI (or locally) can be installed and run standalone,
 * without a dev server reachable on the network.
 */
function withDebugBundling(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withDebugBundling only supports Groovy build.gradle files');
    }

    let contents = config.modResults.contents;

    if (contents.includes('debuggableVariants = []')) {
      // Already patched (e.g. plugin ran twice) — don't duplicate.
      return config;
    }

    contents = contents.replace(
      /(^react\s*\{\n)/m,
      `$1    debuggableVariants = []\n`
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withDebugBundling;
