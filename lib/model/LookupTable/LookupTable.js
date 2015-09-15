var Presets = require('./Presets.js'),
    Monologue = require('monologue.js'),
    CHANGE_TOPIC = 'lookuptable.change';

// Initialize liste
var presetList = [];
for(var key in Presets.lookuptables) {
    presetList.push(key);
}

// Global helper methods ------------------------------------------------------

function applyRatio(a, b, ratio) {
    return ((b - a) * ratio) + a;
}

function interpolateColor(pointA, pointB, scalar) {
    var ratio = (scalar - pointA[0]) / (pointB[0] - pointA[0]);
    return [ applyRatio(pointA[1], pointB[1], ratio),
             applyRatio(pointA[2], pointB[2], ratio),
             applyRatio(pointA[3], pointB[3], ratio),
             255 ];
}

function extractPoint(controlPoints, idx) {
    return [ controlPoints[idx].x, controlPoints[idx].r, controlPoints[idx].g, controlPoints[idx].b ];
}

function xrgbCompare(a,b) {
  return (a.x - b.x);
}

// ----------------------------------------------------------------------------

export default function LookupTable(name, discrete=false) {
    this.name = name;
    this.scalarRange = [0, 1];
    this.delta = 1;
    this.controlPoints = null;
    this.colorTableSize = 256;
    this.colorTable = null;
    this.colorNaN = [0,0,0,0];
    this.setPreset('spectralflip');
    this.discrete = discrete;
    this.scale = 1;

    // Auto rebuild
    this.build();
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(LookupTable);

LookupTable.prototype.getName = function() {
    return this.name;
};

LookupTable.prototype.getPresets = function() {
    return presetList;
};

LookupTable.prototype.setPreset = function(name) {
    this.colorTable = null;
    this.controlPoints = [];

    var colors = Presets.lookuptables[name].controlpoints,
        count = colors.length;

    for(var i = 0; i < count; i++) {
        this.controlPoints.push({
            x: colors[i].x,
            r: colors[i].r,
            g: colors[i].g,
            b: colors[i].b
        });
    }

    // Auto rebuild
    this.build();

    this.emit(CHANGE_TOPIC, { change: 'preset', lut: this });
};

LookupTable.prototype.updateControlPoints = function(controlPoints) {
    this.colorTable = null;
    this.controlPoints = [];

    var count = controlPoints.length;

    for(var i = 0; i < count; i++) {
        this.controlPoints.push({
            x: controlPoints[i].x,
            r: controlPoints[i].r,
            g: controlPoints[i].g,
            b: controlPoints[i].b
        });
    }

    // Auto rebuild
    this.build();

    this.emit(CHANGE_TOPIC, { change: 'controlPoints', lut: this });
};

LookupTable.prototype.setColorForNaN = function(r = 0, g = 0, b = 0, a = 0) {
    this.colorNaN = [r,g,b,a];
};

LookupTable.prototype.getColorForNaN = function() {
    return this.colorNaN;
};

LookupTable.prototype.getScalarRange = function() {
    return [Number(this.scalarRange[0]), Number(this.scalarRange[1])];
};

LookupTable.prototype.setScalarRange = function(min, max) {
    this.scalarRange = [min, max];
    this.delta = max - min;

    this.emit(CHANGE_TOPIC, { change: 'scalarRange', lut: this });
};

LookupTable.prototype.build = function(trigger) {
    if(this.colorTable) {
        return;
    }

    this.colorTable = [];

    var currentControlIdx = 0;
    if(this.discrete) {
        this.colorTableSize = this.controlPoints.length;
        this.scale = 50;
        for (var idx = 0; idx < this.colorTableSize; idx++) {
            var color = this.controlPoints[idx];
            this.colorTable.push([color.r, color.g, color.b, 255]);
        }
    } else {
        this.scale = 1;
        for (var idx = 0; idx < this.colorTableSize; idx++) {
            var value = idx / (this.colorTableSize - 1),
                pointA = extractPoint(this.controlPoints, currentControlIdx),
                pointB = extractPoint(this.controlPoints, currentControlIdx + 1);

            if (value > pointB[0]) {
                currentControlIdx += 1;
                pointA = extractPoint(this.controlPoints, currentControlIdx);
                pointB = extractPoint(this.controlPoints, currentControlIdx + 1);
            }

            this.colorTable.push(interpolateColor(pointA, pointB, value));
        }
    }

    if(trigger) {
        this.emit(CHANGE_TOPIC, { change: 'controlPoints', lut: this });
    }
};

LookupTable.prototype.setNumberOfColors = function(nbColors) {
    this.colorTableSize = nbColors;
    this.colorTable = null;

    // Auto rebuild
    this.build();

    this.emit(CHANGE_TOPIC, { change: 'numberOfColors', lut: this });
};

LookupTable.prototype.getNumberOfControlPoints = function() {
    return this.controlPoints ? this.controlPoints.length : 0;
};

LookupTable.prototype.removeControlPoint = function(idx) {
    if(idx > 0 && idx < this.controlPoints.length - 1) {
        this.controlPoints.splice(idx, 1);

        // Auto rebuild and trigger change
        this.colorTable = null;
        this.build(true);

        return true;
    }
    return false;
};

LookupTable.prototype.getControlPoint = function(idx) {
    return this.controlPoints[idx];
};

LookupTable.prototype.updateControlPoint = function(idx, xrgb) {
    this.controlPoints[idx] = xrgb;
    var xValue = xrgb.x;

    // Ensure order
    this.controlPoints.sort(xrgbCompare);

    // Auto rebuild and trigger change
    this.colorTable = null;
    this.build(true);

    // Return the modified index of current control point
    for(var i = 0; i < this.controlPoints.length; i++) {
        if(this.controlPoints[i].x === xValue) {
            return i;
        }
    }
    return 0;
};

LookupTable.prototype.addControlPoint = function(xrgb) {
    this.controlPoints.push(xrgb);
    var xValue = xrgb.x;

    // Ensure order
    this.controlPoints.sort(xrgbCompare);

    // Auto rebuild and trigger change
    this.colorTable = null;
    this.build(true);

    // Return the modified index of current control point
    for(var i = 0; i < this.controlPoints.length; i++) {
        if(this.controlPoints[i].x === xValue) {
            return i;
        }
    }
    return -1;
};

LookupTable.prototype.drawToCanvas = function(canvas) {
    var colors = this.colorTable,
        length = this.scale * colors.length,
        ctx = canvas.getContext("2d"),
        canvasData = ctx.getImageData(0, 0, length, 1);

    for(var i = 0; i < length; i++) {
        var colorIdx = Math.floor(i/this.scale);
        canvasData.data[i*4 + 0] = Math.floor(255 * colors[colorIdx][0]);
        canvasData.data[i*4 + 1] = Math.floor(255 * colors[colorIdx][1]);
        canvasData.data[i*4 + 2] = Math.floor(255 * colors[colorIdx][2]);
        canvasData.data[i*4 + 3] = 255;
    }
    ctx.putImageData(canvasData, 0, 0);
};

LookupTable.prototype.getColor = function(scalar) {
    if(isNaN(scalar)) {
        return this.colorNaN;
    }
    var idxValue = Math.floor(this.colorTableSize * (scalar - this.scalarRange[0]) / this.delta);
    if(idxValue < 0) {
        return this.colorTable[0];
    }
    if(idxValue >= this.colorTableSize) {
        return this.colorTable[this.colorTable.length  - 1];
    }
    return this.colorTable[idxValue];
};


LookupTable.prototype.destroy = function() {
    this.off(CHANGE_TOPIC);
};

LookupTable.prototype.onChange = function(callback) {
    return this.on(CHANGE_TOPIC, callback);
};
