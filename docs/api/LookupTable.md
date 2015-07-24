# LookupTable

## constructor(name)

Create an instance of a LookupTable while giving it a name. Usually we use the
field name that we want to use that lookupTable for.

## getName() : String

Return the name of the given LookupTable.

## getPresets() : [ String... ]

Return the names of the available presets.

## setPreset(name)

Use a preset to configure the current instance. This will reset all the
control points and used the one defined inside the preset.

This will trigger the following change event

```js
{
    change: 'preset',
    lut: lutInstance
}
```

## getScalarRange() : [min, max]

Return the scalar range the LookupTable is using.

## setScalarRange(min, max)

Update the scalar range that LookupTable is using.

## build(trigger)

This generate a precomputed table for the lookuptable.

If __trigger__ is true, this will trigger the following change event

```js
{
    change: 'controlPoints',
    lut: lutInstance
}
```

## setNumberOfColors( numberOfColors )

Set the number of colors to be used for the concrete scalar to color mapping.

This will trigger the following change event

```js
{
    change: 'numberOfColors',
    lut: lutInstance
}
```

## getNumberOfControlPoints() : Number

Return the number of control points used to define the color map.

## removeControlPoint(idx) : Boolean

If the provided control point index is valid, the given control point will be
removed and the method will return true. Otherwise, the method will return false letting you know that nothing has changed.

## getControlPoint(idx) : {x, r, g, b}

Return the control point define at the provided index.

## updateControlPoint(idx, xrgb) : Number

Update the control point define in the given index by replacing it with the
provided object. The control points will be resorted and the table rebuilt.

The method will return the index of the updated control point which could be different if the x value is different.

## addControlPoint(xrgb) : Number

Add a new control point and return its corresponding index while rebuilding
the full index map.

A control point should be composed of 4 fields x, r, g and b with a number between 0 and 1.

```js
var xrgb = {
    x: 0.5,
    r: 1,
    g: 0,
    b: 0.1
};
```

## drawToCanvas(canvas)

Draw the index map into the canvas using a height of 1 pixel and a width corresponding to the number of colors defined.

## getColor(scalar) : [r, g, b]

Return the color that should be used for a given scalar value. If the value is outside the scalar range, then the last color defined for that edge will be used.

## onChange(callback) : subscription

Helper method used to attach a listener to the topic that is used when the LookupTable change. We rely on Monologue.js for our observer pattern.

## TopicChange() : 'lookuptable.change'

Return the topic used to notify change.

## destroy()

Remove any listener attached to this LookupTable instance.

