# WebGlCompositeImageBuilder

Similar image builder as the CompositeImageBuilder except that it is using WebGL
code based to do the compositing and support different data structures.

```js
var WebGlCompositeImageBuilder = require('tonic-image-builder/lib/builder/WebGlComposite'),
    instance = new WebGlCompositeImageBuilder(queryDataModel, pipelineModel, lookupTableManager);
```

## constructor(queryDataModel, pipelineModel, lookupTableManager)

Create an instance of a CompositeImageBuilder using the associated
__queryDataModel__ that should be used to fetch the data.

And the __pipelineModel__ that should be used for controlling the ImageBuilder.

Under the hood this will create an off-screen canvas for the image generation.
Then, depending if the method setPushMethodAsImage() has been called,
the 'image-ready' notification will not contain the same object.
By default we use the setPushMethodAsBuffer() configuration.

Below are the two event structures

```js
// setPushMethodAsBuffer()
var eventAsBuffer = {
    canvas: DOMElement,
    area: [0, 0, width, height],
    outputSize: [width, height],
    builder: this
};

// setPushMethodAsImage()
var eventAsImage = {
    url: 'data:image/png:ASDGFsdfgsdgf...',
    builder: this
};
```

## update()

Trigger the fetching of the data (composite.json + rgb.jpg).

## setPushMethodAsBuffer()

Change the method to share the image to the outside world.
After that method get called, the notification event will look as follow.

```js
{
    canvas: DOMElement,
    imageData: ImageDataFromCanvas,
    area: [0, 0, width, height],
    outputSize: [width, height],
    builder: this
}
```

## setPushMethodAsImage()

Change the method to share the image to the outside world.
After the method gets called, the notification event will look as follows:

```js
{
    url: 'data:image/png:ASDGFsdfgsdgf...'
    builder: this
}
```

## setPipelineQuery(pipelineQuery)

Should be called each time the pipeline setting is changed.

The __pipelineQuery__ is a string that encodes the pipeline configuration such as
which layer is visible or not and which field should be rendered for a given layer.

The __pipelineQuery__ is structured as follows:

```js
var pipelineQuery = "A_BBCAD_EA";

// In that example we have the following setting
var layerSettings = [
    "A_", // Layer A is invisible
    "BB", // Layer B is using field B
    "CA", // Layer C is using field A
    "D_", // Layer D is invisible
    "EA"  // Layer E is using field A
];
```

## render()

Process the current set of loaded data and render it into the background canvas.
Once done, an event gets triggered to let the application know that the image is
ready to be rendered/displayed somewhere.

## onImageReady(callback) : subscription

Allows the registration of a __callback(data, envelope)__ function when the
actual generated image is ready.

## destroy()

Free the internal resources of the current instance.

## setLightProperties(lightProps)

```js
{
    'lightTerms': {
        ka: 0.1,
        kd: 0.6,
        ks: 0.3,
        alpha: 20
    },
    'lightPosition': {
        x: -1,
        y: 1
    },
    'lightColor': [ 0.8, 0.8, 0.8 ]
}
```

## getListeners

Returns a list of TonicMouseHandler listeners.

## getControlWidgets

Returns an array of control widgets, that is meant to be used with the
WidgetFactory.

## getQueryDataModel

Returns the builder's QueryDataModel.

## getPipelineModel

Returns the builder's PipelineModel.

## getLookupTableManager()

Returns the builder's LookupTableManager.

## getLightProperties() : {}

Return the current set of light properties if any.
