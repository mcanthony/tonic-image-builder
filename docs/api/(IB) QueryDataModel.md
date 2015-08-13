# QueryDataModelImageBuilder

This is a builder which wrap a QueryDataModel to make it act like an ImageBuilder.

```js
var QueryDataModelImageBuilder = require('tonic-image-builder/lib/builder/QueryDataModel'),
    instance = new QueryDataModelImageBuilder(qdm);
```

## constructor(queryDataModel)

Under the hood this will forward any image data.

Below are the two event structures

```js
var eventAsBuffer = {
    canvas: image,
    area: [0, 0, width, height],
    outputSize: [width, height]
};
```

## update()

Trigger the fetching of the data.

## render()

Trigger a notification if the loaded data is available and decoded.

```js
{
    canvas: image,
    area: [0, 0, width, height],
    outputSize: [width, height],
    type: 'composite'
}
```

## onImageReady(callback) : subscription

Allows the registration of a __callback(data, envelope)__ function when the
actual generated image is ready.

## getListeners

Returns a list of TonicMouseHandler listeners.

## getControlWidgets

Returns an array of control widgets, `["QueryDataModelWidget"]`. Meant to be used with the WidgetFactory

## getQueryDataModel

Returns the builder's QueryDataModel.

## destroy()

Free the internal resources of the current instance.
