# DataProberImageBuilder

This class definition let you create an ImageBuilder that let you process probe
datasets. The implementation rely on a single off-screen canvas to generate the
resulting image of a image stack.

## constructor(queryDataModel, pushAsBuffer, lookupTableManager)

Create an instance of a DataProberImageBuilder using the associated
__queryDataModel__ that should be used to fetch the data and the associated set
of LookupTable managed by the __lookupTableManager__ instance.

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

## setProbe(x, y, z)

Update the current probe location. [x,y,z] must be integers and be within the
extent of the dataset.

## getProbe() : [x, y, z]

Return the current probe location within the dataset.

## setField(fieldName)

Set which field should be rendered.

## getField() : fieldName

Return the name of the field that is currently used.

## getFields() : [ ... ]

Return the set of possible fields that can be set.

## getLookupTable() : LookupTable

Return the LookupTable associated to the current __field__.

## getLookupTableManager() : LookupTableManager

Return the LookupTableManager instance that was provided at the creation of
this instance.

## render()

Process the current set of loaded data and render it into the background canvas.
Once done, an event get triggered to let the application know that the image is
ready to be rendered/display somewhere.

Under the cover one of the following methods [renderXY, renderZY, renderXZ] will be called.

## onImageReady(callback) : subscription

This allow the registration of a __callback(data, envelope)__ function when the
actual generated image is ready.

## TopicImageReady() : 'image-ready'

Return the topic used for the notification of the image.

## destroy()

Free the internal resources of the current instance.

## * renderXY()

Concrete render method that get called by the generic __render()__ one.

## * renderZY()

Concrete render method that get called by the generic __render()__ one.

## * renderXZ()

Concrete render method that get called by the generic __render()__ one.

## * pushToFront(width, height)

Trigger the event notification that the image ready. This will call the proper
method to either send the ImageData or an ImageURL.

## * pushToFrontAsImage(width, height)

Method called as __pushToFront__ when __setPushMethodAsImage()__ is used.

## * pushToFrontAsBuffer(width, height)

Method called as __pushToFront__ when setPushMethodAsBuffer()__ is used.

## * applyLookupTable(width, height)

Internal method used to convert RGB encoded scalar value into the appropriate
color based on the current LookupTable setting.

## * getYOffset(slice) : Integer

Internal method used to return the offset index of the image that should be used
within the current image sprite.

## * getImage(slice, callback)

Internal method used to call the callback method on the image when that one is
ready.
