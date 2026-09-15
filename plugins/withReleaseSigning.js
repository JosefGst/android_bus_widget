const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Adds a `release` signingConfig to the generated android/app/build.gradle
 * and points the `release` buildType at it instead of the debug keystore.
 *
 * The keystore path and passwords are read from environment variables at
 * *Gradle build time* (not baked into the generated file), so:
 *  - CI can supply a real release keystore via secrets.
 *  - Local dev / any build without those env vars set keeps signing with
 *    the stock debug keystore, unchanged.
 *
 * Env vars used (all optional — falls back to debug signing if unset):
 *   RELEASE_KEYSTORE_PATH
 *   RELEASE_KEYSTORE_PASSWORD
 *   RELEASE_KEY_ALIAS
 *   RELEASE_KEY_PASSWORD
 */
function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning only supports Groovy build.gradle files');
    }

    let contents = config.modResults.contents;

    if (contents.includes('RELEASE_KEYSTORE_PATH')) {
      // Already patched (e.g. plugin ran twice) — don't duplicate.
      return config;
    }

    const releaseSigningConfig = `        release {
            if (System.getenv("RELEASE_KEYSTORE_PATH")) {
                storeFile file(System.getenv("RELEASE_KEYSTORE_PATH"))
                storePassword System.getenv("RELEASE_KEYSTORE_PASSWORD")
                keyAlias System.getenv("RELEASE_KEY_ALIAS")
                keyPassword System.getenv("RELEASE_KEY_PASSWORD")
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
`;

    contents = contents.replace(
      /(signingConfigs\s*\{\n)/,
      `$1${releaseSigningConfig}`
    );

    // Repoint only the `release` buildType's signingConfig (not `debug`'s,
    // which also references signingConfigs.debug) — find the release
    // buildType block by locating "release {" after "buildTypes {", then
    // patch the first "signingConfig signingConfigs.debug" after it.
    const buildTypesIndex = contents.indexOf('buildTypes');
    if (buildTypesIndex === -1) {
      throw new Error('withReleaseSigning: could not find buildTypes block in build.gradle');
    }
    const releaseBlockIndex = contents.indexOf('release {', buildTypesIndex);
    if (releaseBlockIndex === -1) {
      throw new Error('withReleaseSigning: could not find release buildType block in build.gradle');
    }
    const target = 'signingConfig signingConfigs.debug';
    const targetIndex = contents.indexOf(target, releaseBlockIndex);
    if (targetIndex === -1) {
      throw new Error('withReleaseSigning: could not find release buildType signingConfig line');
    }
    contents =
      contents.slice(0, targetIndex) +
      'signingConfig signingConfigs.release' +
      contents.slice(targetIndex + target.length);

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withReleaseSigning;
