module.exports = function(config) {
  config.set({
    basePath: '..',
    frameworks: [ 'jasmine' ],
    browsers: [
        'PhantomJS',
        'Chrome',
        // 'ChromeCanary',
        'Safari',
        'Firefox',
        // 'IE',
    ],
    files: [
        'dist/TonicImageBuilder.js',
        'tests/*-browser-*.js',
        'lib/*/*/tests/**/*.js'
    ],
    exclude: [
        'lib/*/tests/**/*-node-only.js'
    ],
    proxies: {
    }
  });
};
