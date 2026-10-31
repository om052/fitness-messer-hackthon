const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Metro picks its worker count from the CPU core count (8 workers on a
 * 12-core machine). Every worker is a separate Node process with its own V8
 * heap, so the dev bundler that serves Expo Go can exhaust the machine's
 * commit limit and die with "JavaScript heap out of memory".
 *
 * Capping the worker count keeps `npx expo start` reliable. The release
 * bundle built by Gradle is limited the same way in `android/app/build.gradle`.
 */
config.maxWorkers = 2;

module.exports = config;
