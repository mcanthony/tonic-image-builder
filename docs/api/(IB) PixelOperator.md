# PixelOperator

This Image Builder is meant to compute PixelOperation based on data coming
from other ImageBuilder.

```js
var PixelOperatorImageBuilder = require('tonic-image-builder/lib/builder/PixelOperator'),
    instance = new PixelOperatorImageBuilder('a-b', ['a', 'b']);

instance.updateData('a', imageReadyEvent);
instance.updateData('b', imageReadyEvent);
```

## constructor(operation='a-b', dependency=['a','b'])

Create an instance of a PixelOperatorImageBuilder using the pixel operation that
we want to achieve on a set of image data.

Below is the event structure

```js
// setPushMethodAsBuffer()
var imageReadyEvent = {
    canvas: DOMElement,
    area: [0, 0, width, height],
    outputSize: [width, height],
    builder: this
};
```

## setOperation(String)

Update the operation that you would like to perform on each pixel.

The variables name that you can use are the one that have been registered with
the __updateData(name, event)__ method.

## getOperation() : String

Return the operation that was previously set.

## setDependencies(Array[String])

List the data names that you expect in order to perform your pixel operation.
This will prevent invalid execution if all the data was not fully provided.

## updateOperationFunction()

Internal method used to compile the Operation provided as a String.

## updateData(name, imageReadyEvent)

Method that should be called when new data become available for a given
ImageBuilder.

## processData()

Internal method used to trigger the computation of the Pixel Operation.

## onImageReady(callback) : subscription

Allows the registration of a __callback(data, envelope)__ function when the
actual generated image is ready.

## destroy()

Free the internal resources of the current instance.

## getListeners

Returns a list of TonicMouseHandler listeners.
This will actually return {}.

## getControlWidgets

Returns an array of control widgets, that is meant to be used with the
WidgetFactory.

