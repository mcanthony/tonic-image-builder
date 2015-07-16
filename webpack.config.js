var webpack = require('webpack');

module.exports = {
  plugins: [],
  entry: './lib/index.js',
  output: {
    path: './dist',
    filename: 'TonicImageBuilder.js',
  },
  module: {
    preLoaders: [
      {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "jshint!babel"
      },{
          test: /\.js$/,
          include: /node_modules\/tonic-/,
          loader: "babel"
      }
    ],
    loaders: [
        {
          test: require.resolve("./lib/index.js"),
          loader: "expose?TonicImageBuilder"
        }
    ]
  },
  jshint: {
    esnext: true,
    browser: true,
    globalstrict: true // Babel add 'use strict'
  },
  externals: {
  }
};
