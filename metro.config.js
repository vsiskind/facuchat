// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Resolve 'stream' to 'stream-browserify'
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('stream-browserify'),
  // Some other common Node.js core modules that might cause issues and their browser polyfills:
  // assert: require.resolve('assert/'),
  // buffer: require.resolve('buffer/'),
  // console: require.resolve('console-browserify'),
  // constants: require.resolve('constants-browserify'),
  // crypto: require.resolve('crypto-browserify'),
  // domain: require.resolve('domain-browser'),
  // events: require.resolve('events/'),
  // http: require.resolve('stream-http'),
  // https: require.resolve('https-browserify'),
  // os: require.resolve('os-browserify/browser'),
  // path: require.resolve('path-browserify'),
  // punycode: require.resolve('punycode/'),
  // process: require.resolve('process/browser'),
  // querystring: require.resolve('querystring-es3'),
  // string_decoder: require.resolve('string_decoder/'),
  // sys: require.resolve('util/'),
  // timers: require.resolve('timers-browserify'),
  // tty: require.resolve('tty-browserify'),
  // url: require.resolve('url/'),
  // util: require.resolve('util/'),
  // vm: require.resolve('vm-browserify'),
  // zlib: require.resolve('browserify-zlib'),
};

module.exports = config;
