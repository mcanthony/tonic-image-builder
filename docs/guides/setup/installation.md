---
layout: docs
title: Setup
next_section: webpack
permalink: /docs/home/
repo_path: /docs/guides/setup/installation.md
---

Tonic Image Builder is a library that is meant to be easily integrated into
your environment. For that we provide two ways of integration.

## npm dependency

Our preferred integration path is through npm using _require_ within your
code and relying on _WebPack_ or _Browserify_ to package all your code
dependency into a single or multiple JavaScript files that are dedicated
for your application.

Tonic Data Manager can be added to your package.json with the following
configuration subset.

```
"dependencies": {
    "monologue.js": "0.3.3",
    "mout": "0.11.0",
    "tonic-image-builder": "0.0.2"
}
```

or if you want the latest code base that has not been publish yet to the npm
registry.

```
"dependencies": {
    "tonic-data-manager": ""Kitware/tonic-data-manager"
}
```

To read more on how to use the library within your code and how to
configure _WebPack_ to package your application with all its
dependency. You can refer to the
**_[WebPack documentation guide](/docs/webpack)_**.

## Drop in

You can download manually our packaged version **_[here][JS-File]_** for an
integration into your code base.

[JS-File]: https://raw.githubusercontent.com/Kitware/tonic-query-data-model/master/dist/TonicImageBuilder.js
