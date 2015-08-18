var Monologue = require('monologue.js'),
    PAINTER_READY = 'painter-ready';

// ----------------------------------------------------------------------------

export default function LineChartPainter(title, markerColor="#0000FF", colors=["#e1002a", "#417dc0", "#1d9a57", "#e9bc2f", "#9b3880"]) {
    this.data = null;
    this.colors = colors;
    this.markerColor = markerColor;
    this.markerLocation = -1;
    this.showMarker = true;
    this.title = title;
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

LineChartPainter.prototype.setTitle = function(title) {
    this.title = title;
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

    // Empty content
    ctx.clearRect(location.x - 1, location.y - 1, location.width + 2, location.height + 2);

    // Paint each field
    this.data.fields.forEach((field) => {
        paintField(ctx, location, field);
    });

    // Paint marker if any
    if(this.showMarker) {
        paintMarker(ctx, location, this.markerLocation, this.markerColor);
    }

    // Paint tile if any
    if(this.title) {
        var xValue = ((this.data.xRange[1] - this.data.xRange[0]) * this.markerLocation + this.data.xRange[0]).toFixed(5);
        paintText(ctx, location, 20, 20, this.title.replace(/{x}/g, xValue));
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
        xValues[count] = xOffset + Math.floor(width * (count / (size-1)));
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

// ----------------------------------------------------------------------------

function paintText(ctx, location, xOffset, yOffset, text, color='#000000') {
    ctx.fillStyle = color;
    ctx.font = "30px serif";
    ctx.textBaseline = 'top';
    ctx.fillText(text,location.x + xOffset, location.y + yOffset);
}

// ----------------------------------------------------------------------------

function interpolate(values, xRatio) {
    var size = values.length,
        idx = size * xRatio,
        a = values[Math.floor(idx)],
        b = values[Math.ceil(idx)],
        ratio = idx - Math.floor(idx);
    return ((b-a)*ratio + a).toFixed(5);
}
