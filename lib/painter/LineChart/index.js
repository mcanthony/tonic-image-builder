var Monologue = require('monologue.js'),
    PAINTER_READY = 'painter-ready';

// ----------------------------------------------------------------------------

export default function LineChartPainter(markerColor="#0000FF", colors=["#e1002a", "#417dc0", "#1d9a57", "#e9bc2f", "#9b3880"]) {
    this.data = null;
    this.colors = colors;
    this.markerColor = markerColor;
    this.markerLocation = -1;
    this.showMarker = true;
}

// ----------------------------------------------------------------------------

Monologue.mixInto(LineChartPainter);

// ----------------------------------------------------------------------------
// Expected data structure
// {
//      xRange: [ 0 , 100],
//      fields: [
//          { name: 'Temperature', data: [y0, y1, ..., yn]},
//          ...
//      ]
// }

LineChartPainter.prototype.updateData = function(data) {
    this.data = data;

    // Assign color if no color
    var colorIdx = 0;
    data.fields.forEach((field) => {
        if(!field.color) {
            field.color = this.colors[colorIdx++ % this.colors.length];
        }
    });

    this.emit(PAINTER_READY, this);
}

// ----------------------------------------------------------------------------

LineChartPainter.prototype.setMarkerLocation = function(xRatio) {
    this.markerLocation = xRatio;

    this.emit(PAINTER_READY, this);
}

// ----------------------------------------------------------------------------

LineChartPainter.prototype.enableMarker = function(show) {
    if(this.showMarker !== show) {
        this.showMarker = show;
        this.emit(PAINTER_READY, this);
    }
}

// ----------------------------------------------------------------------------

LineChartPainter.prototype.isReady = function() {
    return (this.data !== null);
}

// ----------------------------------------------------------------------------

LineChartPainter.prototype.paint = function(ctx, location) {
    if(!this.data) {
        return;
    }

    ctx.clearRect(location.x, location.y, location.width, location.height);

    // Paint each field
    this.data.fields.forEach((field) => {
        paintField(ctx, location, field);
    });

    // Paint marker if any
    if(this.showMarker) {
        paintMarker(ctx, location, this.markerLocation, this.markerColor);
    }
}

// ----------------------------------------------------------------------------

LineChartPainter.prototype.onPainterReady = function(callback) {
    return this.on(PAINTER_READY, callback);
}

// ----------------------------------------------------------------------------
// Method meant to be used with the WidgetFactory

LineChartPainter.prototype.getControlWidgets = function() {
    return [];
};

// ----------------------------------------------------------------------------

function paintField(ctx, location, field, range) {
    var min = Number.MAX_VALUE,
        max = Number.MIN_VALUE,
        xOffset = location.x,
        yOffset = location.y,
        width = location.width,
        height = location.height,
        values = field.data,
        size = values.length,
        count = size,
        xValues = new Uint16Array(count);

    // Compute xValues and min/max
    while(count--) {
        var value = values[count];
        min = Math.min(min, value);
        max = Math.max(max, value);
        xValues[count] = xOffset + Math.floor(width * (count / size));
    }

    // Update range if any provided
    if(range) {
        min = range[0];
        max = range[1];
    }

    var scaleY = height / (max - min);
    function getY(idx) {
        return yOffset + height - Math.floor((values[idx] - min) * scaleY);
    }

    // Draw line
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = field.color;
    ctx.moveTo(xValues[0], getY(0));
    for(var idx = 1; idx < size; idx++) {
        ctx.lineTo(xValues[idx], getY(idx));
    }
    ctx.stroke();
}

// ----------------------------------------------------------------------------

function paintMarker(ctx, location, xRatio, color) {
    if(xRatio < 0 || xRatio > 1) {
        return;
    }

    var y1 = location.y,
        y2 = y1 + location.height,
        x = location.x + Math.floor(xRatio * location.width);

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
}
