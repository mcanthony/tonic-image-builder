var webpack = require('webpack');

module.exports = {
  plugins: [],
  entry: './lib/index.js',
  output: {
    path: './dist',
    filename: 'tonic-image-builder.js',
  },
  module: {
    preLoaders: [
      {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "jshint-loader"
      }
    ],
    loaders: [
        {
          test: require.resolve("./lib/index.js"),
          loader: "expose?tonicImageBuilder!babel"
        },{
          test: /\.js$/i,
          loader: "babel-loader"
        }
    ]
  },
  jshint: {
    esnext: true
  },
  externals: {
  }
};
