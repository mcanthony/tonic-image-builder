---
layout: docs
title: Using webpack
prev_section: home
permalink: /docs/webpack/
repo_path: /docs/guides/setup/webpack.md
---

# Get the library

To add the _Tonic Image Builder_ library to your project dependency, just edit
your _package.json_ file and add the following entry inside your _dependencies_
group.

```
"dependencies": {
    "monologue.js": "0.3.3",
    "mout": "0.11.0",
    "tonic-image-builder": "0.0.2",
    [...]
}
```

> Adding the _monologue.js_ and _mout_ here at the root of your project will prevent
> Webpack to encapsulate several versions of it if used across other internal
> dependencies.

# Webpack Configuration

Webpack go through your application dependencies and bundle them within
JavaScript file(s) so they can be used within web pages.

For Webpack to work, you need to provide the entry point of your application
and describe in a configuration file how package should be resolved.
This is specially useful when you are not only requiring JavaScript file but CSS,
Stylus, Jade, Coffee or any other format that may need pre-processing.

Here is a basic setup that may work for you.

```
// webpack.config.js
var webpack = require('webpack');

module.exports = {
  plugins: [],
  entry: './lib/YOUR_APPLICATION_ENTRY_POINT.js',
  output: {
    path: './dist',
    filename: 'BUNDLE_NAME.js',
  },
  module: {
    preLoaders: [
      {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "jshint-loader!babel" // This will validate your code at bundle time and handle ES6/7
      }
    ]
  },
  jshint: {
    esnext: true,
    browser: true,
    globalstrict: true // Babel add 'use strict'
  },
};

```

And by extending the _scripts_ section of your _package.json_ file you can
have shortcut to build/bundle your application.

Here is the set of commands that we tend to use in _Tonic_ components:

```
"scripts": {
    "build": "webpack",
    "build:debug": "webpack --display-modules",
    "build:release": "webpack -p"
}
```

