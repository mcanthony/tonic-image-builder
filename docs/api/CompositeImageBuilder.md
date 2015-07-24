# CompositeImageBuilder

This class definition let you create an ImageBuilder that let you process composite
datasets. The implementation rely on a single off-screen canvas to generate the
resulting image of a composite structure (rgb.jpg + composite.json).

## constructor(queryDataModel, pushAsBuffer)

Create an instance of a CompositeImageBuilder using the associated
__queryDataModel__ that should be used to fetch the data.

Under the cover that will create an off-screen canvas for the image generation.
Then depending of the value of the flag __pushAsBuffer__ the 'image-ready' notification
won't contain the same thing.

Below are the two event structure

```js
// pushAsBuffer = true
var eventAsBuffer = {
    canvas: DOMElement,
    imageData: ImageDataFromCanvas,
    area: [0, 0, width, height],
    outputSize: [width, height],
    type: 'composite'
};

// pushAsBuffer = false
var eventAsImage = {
    url: 'data:image/png:ASDGFsdfgsdgf...'
    type: 'composite'
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
    type: 'composite'
}
```

## setPushMethodAsImage()

Change the method to share the image to the outside world.
After that method get called, the notification event will look as follow.

```js
{
    url: 'data:image/png:ASDGFsdfgsdgf...'
    type: 'composite'
}
```

## setPipelineQuery(pipelineQuery)

This method should be called each time the pipeline setting is changed.

The __pipelineQuery__ is a String that encode the pipeline configuration such as
which layer is visible or not and which field should be rendered for a given layer.

The __pipelineQuery__ is structured as follow.

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
Once done, an event get triggered to let the application know that the image is
ready to be rendered/display somewhere.

## onImageReady(callback) : subscription

This allow the registration of a __callback(data, envelope)__ function when the
actual generated image is ready.

## TopicImageReady() : 'image-ready'

Return the topic used for the notification of the image.

## destroy()

Free the internal resources of the current instance.

## * updateCompositeMap(query, composite)

Internal function used to update the composite map for faster rendering.

## * updateOffsetMap(pipelineQuery)

Internal function used to update the offset map based on the Pipeline configuration.
The __pipelineQuery__ is a String that encode the pipeline configuration such as
which layer is visible or not and which field should be rendered for a given layer.

## * pushToFront(width, height)

Trigger the event notification that the image ready. This will call the proper
method to either send the ImageData or an ImageURL.

## * pushToFrontAsImage(width, height)

Method called as __pushToFront__ when __setPushMethodAsImage()__ is used.

## * pushToFrontAsBuffer(width, height)

Method called as __pushToFront__ when setPushMethodAsBuffer()__ is used.

