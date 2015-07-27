# CanvasOffscreenBuffer #

This class definition lets you create an off-screen canvas to do image manipulation.

## constructor(width, height)

Create a canvas and add it to the DOM under the <body/> element.

## size([width, [height]]) : [ width, height ]

Return the actual canvas size if used without any argument.

If the width and height arguments are provided, this will update the canvas
__width__ and __height__ attributes.

```js
// Get size
var size = instance.size();

// Update size
instance.size(200,500);
```

## get2DContext()

Return the 2D context of the given canvas.

```js
var ctx = instance.get2DContext();

ctx.fillRect(0,0,10,200);

// ...
```

## toDataURL(type='image/png', encoderOptions=1)

Returns a data URI containing a representation of the image in the
format specified by the type parameter (defaults to PNG). The returned image has a resolution of 96 dpi.

- __type__ : A string indicating the image format, the default is image/png.
- __encoderOptions__ : A number between 0 and 1 indicating image quality if the requested type is image/jpeg or image/webp.

## destroy()

Free the internal resources and remove the DOM element from the tree.
