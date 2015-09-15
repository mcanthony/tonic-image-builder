var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    Monologue             = require('monologue.js'),
    IMAGE_READY_TOPIC     = 'image-ready',
    PROBE_LINE_READY_TOPIC = 'ProbeImageBuilder.chart.data.ready',
    PROBE_CHANGE_TOPIC = 'ProbeImageBuilder.probe.location.change',
    CROSSHAIR_VISIBILITY_CHANGE_TOPIC = 'ProbeImageBuilder.crosshair.visibility.change',
    RENDER_METHOD_CHANGE_TOPIC = 'ProbeImageBuilder.render.change',
    dataMapping = {
        XY: {
            idx: [0,1,2],
            hasChange: function(probe, x, y, z) {
                return (probe[2] !== z);
            }
        },
        XZ: {
            idx: [0,2,1],
            hasChange: function(probe, x, y, z) {
                return (probe[1] !== y);
            }
        },
        ZY: {
            idx: [2,1,0],
            hasChange: function(probe, x, y, z) {
                return (probe[0] !== x);
            }
        }
    };

// RawDataProberImageBuilder Object ----------------------------------------------

export default function RawDataProberImageBuilder(queryDataModel, lutManager) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.DataProber;
    this.lookupTableManager = lutManager;
    this.renderMethodMutable = true;
    this.renderMethod = 'XY';
    this.triggerProbeLines = false;
    this.broadcastCrossHair = true;
    this.probeValue = 0;
    this.probeXYZ = [
        Math.floor(this.metadata.dimensions[0] / 2),
        Math.floor(this.metadata.dimensions[1] / 2),
        Math.floor(this.metadata.dimensions[2] / 2)
    ];
    this.fields = Object.keys(this.metadata.types);
    this.field = this.fields[0];
    this.dataFields = null;
    this.pushMethod = 'pushToFrontAsBuffer';

    // Update LookupTableManager with data range
    this.lookupTableManager.updateActiveLookupTable(this.field);
    this.lookupTableManager.addFields(this.metadata.ranges, this.queryDataModel.originalData.LookupTables);

    var maxSize = 0;
    for(var i = 0; i < 3; ++i) {
        var currentSize = this.metadata.dimensions[i];
        maxSize = (maxSize < currentSize) ? currentSize : maxSize;
    }
    this.bgCanvas = new CanvasOffscreenBuffer(maxSize, maxSize);
    this.fgCanvas = null;

    // Handle events
    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.dataFields = {};
        for(var field in data) {
            this.dataFields[field] = new window[this.metadata.types[field]](data[field].data);
        }
        this.render();
     });

    this.lutActiveSubscription = this.lookupTableManager.onActiveLookupTableChange( (data, envelope) => {
        if(this.field !== data) {
            this.field = data;
            this.render();
        }
    });

    this.lutChangeSubscription = this.lookupTableManager.onChange( (data, envelope) => {
        this.update();
    });

    // Event handler
    var self = this;
    this.mouseListener = {
        click:  function(event, envelope) {
            if(!event.activeArea) {
                return false;
            }
            var probe = [self.probeXYZ[0], self.probeXYZ[1], self.probeXYZ[2]],
                axisMap = dataMapping[self.renderMethod].idx,
                dimensions = self.metadata.dimensions,
                activeArea = event.activeArea,
                xRatio = (event.relative.x - activeArea[0]) / activeArea[2],
                yRatio = (event.relative.y - activeArea[1]) / activeArea[3];

            if(event.modifier) {
                return false;
            }

            // Clamp bounds
            xRatio = (xRatio < 0) ? 0 : (xRatio > 1) ? 1 : xRatio;
            yRatio = (yRatio < 0) ? 0 : (yRatio > 1) ? 1 : yRatio;

            if(self.renderMethod === 'XZ') {
                // We flipped Y
                yRatio = 1 - yRatio;
            }

            var xPos = Math.floor(xRatio * dimensions[axisMap[0]]),
                yPos = Math.floor(yRatio * dimensions[axisMap[1]]);

            probe[axisMap[0]] = xPos;
            probe[axisMap[1]] = yPos;

            self.setProbe(probe[0], probe[1], probe[2]);

            return true;
        },
        drag: function(event, envelope) {
            if(!event.activeArea) {
                return false;
            }
            var probe = [self.probeXYZ[0], self.probeXYZ[1], self.probeXYZ[2]],
                axisMap = dataMapping[self.renderMethod].idx,
                dimensions = self.metadata.dimensions,
                activeArea = event.activeArea,
                xRatio = (event.relative.x - activeArea[0]) / activeArea[2],
                yRatio = (event.relative.y - activeArea[1]) / activeArea[3];

            if(event.modifier) {
                return false;
            }

            // Clamp bounds
            xRatio = (xRatio < 0) ? 0 : (xRatio > 1) ? 1 : xRatio;
            yRatio = (yRatio < 0) ? 0 : (yRatio > 1) ? 1 : yRatio;

            if(self.renderMethod === 'XZ') {
                // We flipped Y
                yRatio = 1 - yRatio;
            }

            var xPos = Math.floor(xRatio * dimensions[axisMap[0]]),
                yPos = Math.floor(yRatio * dimensions[axisMap[1]]);

            probe[axisMap[0]] = xPos;
            probe[axisMap[1]] = yPos;

            self.setProbe(probe[0], probe[1], probe[2]);

            return true;
        },
        zoom: function(event, envelope) {
            var probe = [self.probeXYZ[0], self.probeXYZ[1], self.probeXYZ[2]],
                axisMap = dataMapping[self.renderMethod].idx,
                idx = axisMap[2];

            if(event.modifier) {
                return false;
            }

            probe[idx] += (event.deltaY < 0) ? -1 : 1;

            if(probe[idx] < 0) {
                probe[idx] = 0;
                return true;
            }

            if(probe[idx] >= self.metadata.dimensions[idx]) {
                probe[idx] = self.metadata.dimensions[idx] - 1;
                return true;
            }

            self.setProbe(probe[0], probe[1], probe[2]);

            return true;
        }
    };
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(RawDataProberImageBuilder);

RawDataProberImageBuilder.prototype.setPushMethodAsBuffer = function() {
    this.pushMethod = 'pushToFrontAsBuffer';
}

RawDataProberImageBuilder.prototype.setPushMethodAsImage = function() {
    this.pushMethod = 'pushToFrontAsImage';
}

RawDataProberImageBuilder.prototype.setProbeLineNotification = function(trigger) {
    this.triggerProbeLines = trigger;
}

RawDataProberImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
}

RawDataProberImageBuilder.prototype.updateProbeValue = function() {
   var x = this.probeXYZ[0],
       y = this.probeXYZ[1],
       z = this.probeXYZ[2],
       xSize = this.metadata.dimensions[0],
       ySize = this.metadata.dimensions[1],
       zSize = this.metadata.dimensions[2],
       array = this.dataFields[this.field];

    if(array) {
        this.probeValue = array[x + (ySize - y - 1) * xSize + z * xSize * ySize];
    }
}


RawDataProberImageBuilder.prototype.setProbe = function(x, y, z) {
    var fn = dataMapping[this.renderMethod].hasChange,
        idx = dataMapping[this.renderMethod].idx,
        previousValue = [].concat(this.probeXYZ);

    // Allow x to be [x,y,z]
    if(Array.isArray(x)) {
        z = x[2];
        y = x[1];
        x = x[0];
    }

    if(fn(this.probeXYZ, x, y, z)) {
        this.probeXYZ = [x,y,z];
        this.render();
    } else {
        this.probeXYZ = [x,y,z];
        var dimensions = this.metadata.dimensions,
            spacing = this.metadata.spacing;

        this.updateProbeValue();

        if(this.renderMethod === 'XZ') {
            // Need to flip Y axis
            this.pushToFront(dimensions[idx[0]], dimensions[idx[1]], spacing[idx[0]], spacing[idx[1]], this.probeXYZ[idx[0]], dimensions[idx[1]] - this.probeXYZ[idx[1]] - 1);
        } else {
            this.pushToFront(dimensions[idx[0]], dimensions[idx[1]], spacing[idx[0]], spacing[idx[1]], this.probeXYZ[idx[0]], this.probeXYZ[idx[1]]);
        }

    }

    if(previousValue[0] === x && previousValue[1] === y && previousValue[2] === z) {
        return; // No change detected
    }

    // Let other know
    this.emit(PROBE_CHANGE_TOPIC, [x,y,z]);
};

RawDataProberImageBuilder.prototype.getProbe = function() {
    return this.probeXYZ;
};

RawDataProberImageBuilder.prototype.getFieldValueAtProbeLocation = function() {
    return this.probeValue;
};

RawDataProberImageBuilder.prototype.getProbeLine = function(axisIdx) {
    var probeData = { xRange: [ 0 , 100], fields: [] },
        fields = this.fields,
        px = this.probeXYZ[0],
        py = this.probeXYZ[1],
        pz = this.probeXYZ[2],
        xSize = this.metadata.dimensions[0],
        ySize = this.metadata.dimensions[1],
        zSize = this.metadata.dimensions[2],
        idxValues = [];

    if(axisIdx === 0) {
        var offset = (ySize - py - 1)*xSize + pz*xSize*ySize;
        for(var x = 0; x < xSize; x++) {
            idxValues.push(offset + x);
        }
    }
    if(axisIdx === 1) {
        var offset = px + pz*xSize*ySize;
        for(var y = 0; y < ySize; y++) {
            idxValues.push(offset + (ySize - y - 1)*xSize);
        }
        idxValues.reverse();
    }
    if(axisIdx === 2) {
        var offset = px + (ySize - py - 1)*xSize,
            step = xSize*ySize;
        for(var z = 0; z < zSize; z++) {
            idxValues.push(offset + z*step);
        }
    }

    // Fill all fields
    var dataSize = idxValues.length;
    fields.forEach((name) => {
        var array = this.dataFields[name],
            data = [],
            range = this.lookupTableManager.getLookupTable(name).getScalarRange();

        for(var i = 0; i < dataSize; i++) {
            data.push(array[idxValues[i]]);
        }

        probeData.fields.push({name, data, range});
    });

    return probeData;
};

RawDataProberImageBuilder.prototype.render = function() {
    if(!this.dataFields) {
        return;
    }

    this.updateProbeValue();
    this['render' + this.renderMethod]();
};

RawDataProberImageBuilder.prototype.pushToFront = function(width, height, scaleX, scaleY, lineX, lineY) {
    this[this.pushMethod](width, height, scaleX, scaleY, lineX, lineY);

    if(this.triggerProbeLines) {
        this.emit(PROBE_LINE_READY_TOPIC, { x: this.getProbeLine(0), y: this.getProbeLine(1), z: this.getProbeLine(2) });
    }
};

RawDataProberImageBuilder.prototype.pushToFrontAsImage = function(width, height, scaleX, scaleY, lineX, lineY) {
    var destWidth = Math.floor(width * scaleX),
        destHeight = Math.floor(height * scaleY),
        ctx = null;


    // Make sure we have a foreground buffer
    if(this.fgCanvas) {
        this.fgCanvas.size(destWidth, destHeight);
    } else {
        this.fgCanvas = new CanvasOffscreenBuffer(destWidth, destHeight);
    }

    ctx = this.fgCanvas.get2DContext();
    ctx.drawImage(this.bgCanvas.el, 0, 0, width, height, 0, 0, destWidth, destHeight);

    // Draw cross hair probe position
    ctx.beginPath();
    ctx.moveTo(lineX * scaleX, 0);
    ctx.lineTo(lineX * scaleX, destHeight);
    ctx.moveTo(0, lineY * scaleY);
    ctx.lineTo(destWidth, lineY * scaleY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    var readyImage = { url: this.fgCanvas.toDataURL(), type: this.renderMethod, builder: this };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

RawDataProberImageBuilder.prototype.pushToFrontAsBuffer = function(width, height, scaleX, scaleY, lineX, lineY) {
    var destWidth = Math.floor(width * scaleX),
        destHeight = Math.floor(height * scaleY);

    var readyImage = {
        canvas: this.bgCanvas.el,
        imageData: this.bgCanvas.el.getContext('2d').getImageData(0, 0, width, height),
        area: [0, 0, width, height],
        outputSize: [destWidth, destHeight],
        type: this.renderMethod,
        builder: this
    };

    if(this.broadcastCrossHair) {
        readyImage.crosshair = [lineX, lineY];
    }

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

RawDataProberImageBuilder.prototype.renderXY = function() {
    var ctx = this.bgCanvas.get2DContext(),
        xyz = this.probeXYZ,
        dimensions = this.metadata.dimensions,
        xSize = dimensions[0],
        ySize = dimensions[1],
        spacing = this.metadata.spacing,
        imageBuffer = ctx.createImageData(dimensions[0], dimensions[1]),
        pixels = imageBuffer.data,
        imageSize = dimensions[0] * dimensions[1],
        offset = imageSize * xyz[2],
        lut = this.lookupTableManager.getLookupTable(this.field),
        array = this.dataFields[this.field];

    // Need to flip along Y
    var idx = 0;
    for(var y = 0; y < ySize; y++){
        for(var x = 0; x < xSize; x++) {
            var color = lut.getColor(array[offset + x + xSize*(ySize - y - 1)]);
            pixels[idx*4]   = 255 * color[0];
            pixels[idx*4+1] = 255 * color[1];
            pixels[idx*4+2] = 255 * color[2];
            pixels[idx*4+3] = 255;
            idx++;
        }
    }

    ctx.putImageData(imageBuffer, 0, 0);
    this.pushToFront(dimensions[0], dimensions[1], spacing[0], spacing[1], xyz[0], xyz[1]);
};

RawDataProberImageBuilder.prototype.renderZY = function() {
    var ctx = this.bgCanvas.get2DContext(),
        xyz = this.probeXYZ,
        dimensions = this.metadata.dimensions,
        offsetX = xyz[0],
        stepY = dimensions[0],
        stepZ = dimensions[0] * dimensions[1],
        ySize = dimensions[1],
        zSize = dimensions[2],
        spacing = this.metadata.spacing,
        imageBuffer = ctx.createImageData(dimensions[2], dimensions[1]),
        pixels = imageBuffer.data,
        lut = this.lookupTableManager.getLookupTable(this.field),
        array = this.dataFields[this.field];

    // FIXME data is flipped
    var idx = 0;
    for(var y = 0; y < ySize; y++) {
        for(var z = 0; z < zSize; z++) {
            var color = lut.getColor(array[offsetX + stepY*(ySize - y - 1) + stepZ*z]);
            pixels[idx*4]   = 255 * color[0];
            pixels[idx*4+1] = 255 * color[1];
            pixels[idx*4+2] = 255 * color[2];
            pixels[idx*4+3] = 255;
            idx++;
        }
    }
    ctx.putImageData(imageBuffer, 0, 0);
    this.pushToFront(dimensions[2], dimensions[1], spacing[2], spacing[1], xyz[2], xyz[1]);
};


RawDataProberImageBuilder.prototype.renderXZ = function() {
    var ctx = this.bgCanvas.get2DContext(),
        xyz = this.probeXYZ,
        dimensions = this.metadata.dimensions,
        xSize = dimensions[0],
        zSize = dimensions[2],
        zStep = xSize * dimensions[1],
        offset = xSize * (dimensions[1] - xyz[1] - 1),
        spacing = this.metadata.spacing,
        imageBuffer = ctx.createImageData(xSize, zSize),
        pixels = imageBuffer.data,
        lut = this.lookupTableManager.getLookupTable(this.field),
        array = this.dataFields[this.field];

    var idx = 0;
    for(var z = 0; z < zSize; z++){
        for(var x = 0; x < xSize; x++) {
            var color = lut.getColor(array[offset + x + (zSize - z - 1)*zStep]);
            pixels[idx*4]   = 255 * color[0];
            pixels[idx*4+1] = 255 * color[1];
            pixels[idx*4+2] = 255 * color[2];
            pixels[idx*4+3] = 255;
            idx++;
        }
    }

    ctx.putImageData(imageBuffer, 0, 0);
    this.pushToFront(dimensions[0], dimensions[2], spacing[0], spacing[2], xyz[0], zSize - xyz[2] - 1);
};

RawDataProberImageBuilder.prototype.isCrossHairEnabled = function() {
    return this.broadcastCrossHair;
};

RawDataProberImageBuilder.prototype.setCrossHairEnable = function(useCrossHair) {
    if(this.broadcastCrossHair !== useCrossHair) {
        this.broadcastCrossHair = useCrossHair;
        this.emit(CROSSHAIR_VISIBILITY_CHANGE_TOPIC, useCrossHair);
        this.setProbe(this.probeXYZ[0], this.probeXYZ[1], this.probeXYZ[2]);
    }
};

RawDataProberImageBuilder.prototype.setField = function(value) {
    this.field = value;
};

RawDataProberImageBuilder.prototype.getField = function() {
    return this.field;
};

RawDataProberImageBuilder.prototype.getFields = function() {
    return this.fields;
};

RawDataProberImageBuilder.prototype.setRenderMethod = function(renderMethod) {
    if(this.renderMethodMutable && this.renderMethod !== renderMethod) {
        this.renderMethod = renderMethod;
        this.render();
        this.emit(RENDER_METHOD_CHANGE_TOPIC, renderMethod);
    }
};

RawDataProberImageBuilder.prototype.getRenderMethod = function() {
    return this.renderMethod;
};

RawDataProberImageBuilder.prototype.getRenderMethods = function() {
    return ['XY', 'ZY', 'XZ'];
};

RawDataProberImageBuilder.prototype.isRenderMethodMutable = function() {
    return this.renderMethodMutable;
};

RawDataProberImageBuilder.prototype.setRenderMethodImutable = function() {
    this.renderMethodMutable = false;
};

RawDataProberImageBuilder.prototype.setRenderMethodMutable = function() {
    this.renderMethodMutable = true;
};

RawDataProberImageBuilder.prototype.getListeners = function() {
    return this.mouseListener;
};

RawDataProberImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

RawDataProberImageBuilder.prototype.onProbeLineReady = function(callback) {
    return this.on(PROBE_LINE_READY_TOPIC, callback);
};

RawDataProberImageBuilder.prototype.onProbeChange = function(callback) {
    return this.on(PROBE_CHANGE_TOPIC, callback);
};

RawDataProberImageBuilder.prototype.onRenderMethodChange = function(callback) {
    return this.on(RENDER_METHOD_CHANGE_TOPIC, callback);
};

RawDataProberImageBuilder.prototype.onCrosshairVisibilityChange = function(callback) {
    return this.on(CROSSHAIR_VISIBILITY_CHANGE_TOPIC, callback);
};

RawDataProberImageBuilder.prototype.destroy = function() {
    this.off();

    this.lutChangeSubscription.unsubscribe();
    this.lutChangeSubscription = null;

    this.lutActiveSubscription.unsubscribe();
    this.lutActiveSubscription = null;

    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.queryDataModel = null;

    this.bgCanvas.destroy();
    this.bgCanvas = null;
};

// Method meant to be used with the WidgetFactory
RawDataProberImageBuilder.prototype.getControlWidgets = function() {
    return [ "LookupTableManagerWidget", "ProbeControl", "QueryDataModelWidget" ];
};

RawDataProberImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

RawDataProberImageBuilder.prototype.getOriginalRange = function() {
    return this.metadata.ranges[this.field];
}

RawDataProberImageBuilder.prototype.getLookupTable = function() {
    return this.lookupTableManager.getLookupTable(this.field);
};

RawDataProberImageBuilder.prototype.getLookupTableManager = function() {
    return this.lookupTableManager;
};
