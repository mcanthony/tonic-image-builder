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
            },
            updateProbeValue: function(self, x, y, z) {
                var width = self.metadata.dimensions[0],
                    idx = x + y * width,
                    array = self.scalars[self.getField()];

                if(array) {
                    self.probeValue = array[idx];
                }
            }
        },
        XZ: {
            idx: [0,2,1],
            hasChange: function(probe, x, y, z) {
                return (probe[1] !== y);
            },
            updateProbeValue: function(self, x, y, z) {
                var width = self.metadata.dimensions[0],
                    idx = x + z * width,
                    array = self.scalars[self.getField()];

                if(array) {
                    self.probeValue = array[idx];
                }
            }
        },
        ZY: {
            idx: [2,1,0],
            hasChange: function(probe, x, y, z) {
                return (probe[0] !== x);
            },
            updateProbeValue: function(self, x, y, z) {
                var width = self.metadata.dimensions[2],
                    idx = z + y * width,
                    array = self.scalars[self.getField()];

                if(array) {
                    self.probeValue = array[idx];
                }
            }
        }
    };

// DataProberImageBuilder Object ----------------------------------------------

export default function DataProberImageBuilder(queryDataModel, lutManager) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.InSituDataProber;
    this.lookupTableManager = lutManager;
    this.fieldIndex = 0;
    this.renderMethodMutable = true;
    this.renderMethod = 'XY';
    this.lastImageStack = null;
    this.workImage = new Image();
    this.triggerProbeLines = false;
    this.broadcastCrossHair = true;
    this.scalars = {};
    this.probeValue = 0;
    this.probeXYZ = [
        Math.floor(this.metadata.dimensions[0] / 2),
        Math.floor(this.metadata.dimensions[1] / 2),
        Math.floor(this.metadata.dimensions[2] / 2)
    ];
    this.setField(this.metadata.fields[this.fieldIndex]);
    this.pushMethod = 'pushToFrontAsBuffer';

    // Update LookupTableManager with data range
    this.lookupTableManager.addFields(this.metadata.ranges);

    var maxSize = 0;
    for(var i = 0; i < 3; ++i) {
        var currentSize = this.metadata.dimensions[i];
        maxSize = (maxSize < currentSize) ? currentSize : maxSize;
    }
    this.bgCanvas = new CanvasOffscreenBuffer(maxSize, maxSize);
    this.fgCanvas = null;

    // Handle events
    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.lastImageStack = data;

        var canRenderNow = true,
            renderCallback = (() => {
                this.render();
            });

        for(var key in data) {
            var img = data[key].image;
            img.addEventListener('load', renderCallback);
            canRenderNow = canRenderNow && img.complete;
        }

        if(canRenderNow) {
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
Monologue.mixInto(DataProberImageBuilder);

DataProberImageBuilder.prototype.setPushMethodAsBuffer = function() {
    this.pushMethod = 'pushToFrontAsBuffer';
};

DataProberImageBuilder.prototype.setPushMethodAsImage = function() {
    this.pushMethod = 'pushToFrontAsImage';
};

DataProberImageBuilder.prototype.setProbeLineNotification = function(trigger) {
    this.triggerProbeLines = trigger;
};

DataProberImageBuilder.prototype.getYOffset = function(slice) {
    if(slice === undefined) {
        slice = this.probeXYZ[2];
    }
    return this.metadata.sprite_size - slice % this.metadata.sprite_size - 1;
};

DataProberImageBuilder.prototype.getImage = function(slice, callback) {
    if(slice === undefined) {
        slice = this.probeXYZ[2];
    }

    // Use the pre-loaded image
    var max = this.metadata.slices.length - 1,
        idx = Math.floor(slice/this.metadata.sprite_size);

    idx = idx < 0 ? 0 : (idx > max) ? max : idx;

    var data = this.lastImageStack[this.metadata.slices[idx]],
        img = data.image;

    if(img) {
        if(img.complete) {
            callback.call(img);
        } else {
            img.addEventListener('load', callback);
        }
    } else {
        this.workImage.addEventListener('load', callback);
        this.workImage.src = data.url;
    }
};

DataProberImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
};

DataProberImageBuilder.prototype.setProbe = function(x, y, z) {
    var fn = dataMapping[this.renderMethod].hasChange,
        idx = dataMapping[this.renderMethod].idx;

    if(fn(this.probeXYZ, x, y, z)) {
        this.probeXYZ = [x,y,z];
        this.render();
    } else {
        this.probeXYZ = [x,y,z];
        var dimensions = this.metadata.dimensions,
            spacing = this.metadata.spacing;

        dataMapping[this.renderMethod].updateProbeValue(this, x, y, z);
        this.pushToFront(dimensions[idx[0]], dimensions[idx[1]], spacing[idx[0]], spacing[idx[1]], this.probeXYZ[idx[0]], this.probeXYZ[idx[1]]);
    }

    // Let other know
    this.emit(PROBE_CHANGE_TOPIC, [x,y,z]);
};

DataProberImageBuilder.prototype.getProbe = function() {
    return this.probeXYZ;
};

DataProberImageBuilder.prototype.getFieldValueAtProbeLocation = function() {
    return this.probeValue;
};

DataProberImageBuilder.prototype.getProbeLine = function(axisIdx) {
    var fieldData = { name: this.getField(), data: [] },
        probeData = { xRange: [ 0 , 100], fields: [fieldData] },
        axisToProbe = -1,
        axisMapping = dataMapping[this.renderMethod].idx;

    for(var i = 0; i < 2; i++) {
        if(axisIdx === axisMapping[i]) {
            axisToProbe = i;
        }
    }

    if(axisToProbe !== -1) {
        var scalarPlan = this.scalars[fieldData.name],
            dimensions = this.metadata.dimensions,
            width = dimensions[axisMapping[0]],
            height = dimensions[axisMapping[1]],
            deltaStep = (axisToProbe === 0) ? 1 : width,
            offset = (axisToProbe === 0) ? this.probeXYZ[axisMapping[1]] * width : this.probeXYZ[axisMapping[0]],
            size = (axisToProbe === 0) ? width : height;

        if(this.metadata.origin && this.metadata.spacing) {
            probeData.xRange[0] = this.metadata.origin[axisIdx];
            probeData.xRange[1] = this.metadata.origin[axisIdx] + this.metadata.spacing[axisIdx] * dimensions[axisIdx];
        }

        if(scalarPlan) {
            for(var j = 0; j < size; j++) {
                fieldData.data.push(scalarPlan[offset + (j*deltaStep)]);
            }
        }
    }

    return probeData;
};

DataProberImageBuilder.prototype.render = function() {
    if(!this.lastImageStack) {
        return;
    }

    this['render' + this.renderMethod]();

    // Update probe value
    dataMapping[this.renderMethod].updateProbeValue(this, this.probeXYZ[0], this.probeXYZ[1], this.probeXYZ[2]);
};

DataProberImageBuilder.prototype.pushToFront = function(width, height, scaleX, scaleY, lineX, lineY) {
    this[this.pushMethod](width, height, scaleX, scaleY, lineX, lineY);

    if(this.triggerProbeLines) {
        this.emit(PROBE_LINE_READY_TOPIC, { x: this.getProbeLine(0), y: this.getProbeLine(1), z: this.getProbeLine(2) });
    }
};

DataProberImageBuilder.prototype.pushToFrontAsImage = function(width, height, scaleX, scaleY, lineX, lineY) {
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

    var readyImage = { url: this.fgCanvas.toDataURL(), type: this.renderMethod };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

DataProberImageBuilder.prototype.pushToFrontAsBuffer = function(width, height, scaleX, scaleY, lineX, lineY) {
    var destWidth = Math.floor(width * scaleX),
        destHeight = Math.floor(height * scaleY);

    var readyImage = {
        canvas: this.bgCanvas.el,
        imageData: this.bgCanvas.el.getContext('2d').getImageData(0, 0, width, height),
        area: [0, 0, width, height],
        outputSize: [destWidth, destHeight],
        type: this.renderMethod
    };

    if(this.broadcastCrossHair) {
        readyImage.crosshair = [lineX, lineY];
    }

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

DataProberImageBuilder.prototype.renderXY = function() {
    var self = this,
        ctx = this.bgCanvas.get2DContext(),
        offset = this.getYOffset(),
        xyz = this.probeXYZ,
        dimensions = this.metadata.dimensions,
        spacing = this.metadata.spacing;

    this.getImage(this.probeXYZ[2], function() {
        var image = this;
        ctx.drawImage(image, 0, dimensions[1]*offset, dimensions[0], dimensions[1], 0, 0, dimensions[0], dimensions[1]);

        self.extractNumericalValues(dimensions[0], dimensions[1]);
        self.applyLookupTable(dimensions[0], dimensions[1]);
        self.pushToFront(dimensions[0], dimensions[1], spacing[0], spacing[1], xyz[0], xyz[1]);
    });
};

DataProberImageBuilder.prototype.renderZY = function() {
    var self = this,
        ctx = this.bgCanvas.get2DContext(),
        offset = this.getYOffset(),
        xyz = this.probeXYZ,
        dimensions = this.metadata.dimensions,
        activeColumn = dimensions[2],
        spacing = this.metadata.spacing;

    function processLine() {
        var offset = self.getYOffset(activeColumn),
            image = this;

        ctx.drawImage(image,
            xyz[0], dimensions[1]*offset,
            1, dimensions[1],
            activeColumn, 0, 1, dimensions[1]);

        if(activeColumn--) {
            self.getImage(activeColumn, processLine);
        } else {
            // Rendering is done
            self.extractNumericalValues(dimensions[2], dimensions[1]);
            self.applyLookupTable(dimensions[2], dimensions[1]);
            self.pushToFront(dimensions[2], dimensions[1], spacing[2], spacing[1], xyz[2], xyz[1]);
        }
    }

    if(activeColumn--) {
        self.getImage(activeColumn, processLine);
    }
};


DataProberImageBuilder.prototype.renderXZ = function() {
    var self = this,
        ctx = this.bgCanvas.get2DContext(),
        offset = this.getYOffset(),
        xyz = this.probeXYZ,
        dimensions = this.metadata.dimensions,
        spacing = this.metadata.spacing,
        activeLine = dimensions[2];

    function processLine() {
        var offset = self.getYOffset(activeLine),
            image = this;

        ctx.drawImage(image,
            0, dimensions[1]*offset + xyz[1],
            dimensions[0], 1,
            0, activeLine, dimensions[0], 1);

        if(activeLine--) {
            self.getImage(activeLine, processLine);
        } else {
            // Rendering is done
            self.extractNumericalValues(dimensions[0], dimensions[2]);
            self.applyLookupTable(dimensions[0], dimensions[2]);
            self.pushToFront(dimensions[0], dimensions[2], spacing[0], spacing[2], xyz[0], xyz[2]);
        }
    }

    if(activeLine--) {
        self.getImage(activeLine, processLine);
    }
};

DataProberImageBuilder.prototype.isCrossHairEnabled = function() {
    return this.broadcastCrossHair;
};

DataProberImageBuilder.prototype.setCrossHairEnable = function(useCrossHair) {
    if(this.broadcastCrossHair !== useCrossHair) {
        this.broadcastCrossHair = useCrossHair;
        this.emit(CROSSHAIR_VISIBILITY_CHANGE_TOPIC, useCrossHair);
        this.setProbe(this.probeXYZ[0], this.probeXYZ[1], this.probeXYZ[2]);
    }
};

DataProberImageBuilder.prototype.extractNumericalValues = function(width, height) {
    var ctx = this.bgCanvas.get2DContext(),
        fieldName = this.getField(),
        pixels = ctx.getImageData(0, 0, width, height),
        pixBuffer = pixels.data,
        size = pixBuffer.length,
        idx = 0,
        fieldRange = this.metadata.ranges[fieldName],
        delta = fieldRange[1] - fieldRange[0],
        arrayIdx = 0,
        array = new Float32Array(width * height);

    while(idx < size) {
        var value = ((pixBuffer[idx] + (256*pixBuffer[idx+1]) + (65536*pixBuffer[idx+2])) / 16777216) * delta + fieldRange[0];
        array[arrayIdx++] = value;

        // Move to next pixel
        idx += 4;
    }
    this.scalars[fieldName] = array;
};

DataProberImageBuilder.prototype.applyLookupTable = function(width, height) {
    var ctx = this.bgCanvas.get2DContext(),
        fieldName = this.getField(),
        lut = this.lookupTableManager.getLookupTable(fieldName),
        pixels = ctx.getImageData(0, 0, width, height),
        pixBuffer = pixels.data,
        size = pixBuffer.length,
        idx = 0,
        arrayIdx = 0,
        array = this.scalars[fieldName];

    if(lut) {
        while(idx < size) {
             var color = lut.getColor(array[arrayIdx++]);

             pixBuffer[idx]   = Math.floor(255 * color[0]);
             pixBuffer[idx+1] = Math.floor(255 * color[1]);
             pixBuffer[idx+2] = Math.floor(255 * color[2]);

             // Move to next pixel
             idx += 4;
        }
        ctx.putImageData(pixels, 0, 0);
    }
};

DataProberImageBuilder.prototype.setField = function(fieldName) {
    this.queryDataModel.setValue('field', fieldName);
};

DataProberImageBuilder.prototype.getField = function() {
    return this.queryDataModel.getValue('field');
};

DataProberImageBuilder.prototype.getFields = function() {
    return this.metadata.fields;
};

DataProberImageBuilder.prototype.setRenderMethod = function(renderMethod) {
    if(this.renderMethodMutable && this.renderMethod !== renderMethod) {
        this.renderMethod = renderMethod;
        this.render();
        this.emit(RENDER_METHOD_CHANGE_TOPIC, renderMethod);
    }
};

DataProberImageBuilder.prototype.getRenderMethod = function() {
    return this.renderMethod;
};

DataProberImageBuilder.prototype.getRenderMethods = function() {
    return ['XY', 'ZY', 'XZ'];
};

DataProberImageBuilder.prototype.isRenderMethodMutable = function() {
    return this.renderMethodMutable;
};

DataProberImageBuilder.prototype.setRenderMethodImutable = function() {
    this.renderMethodMutable = false;
};

DataProberImageBuilder.prototype.setRenderMethodMutable = function() {
    this.renderMethodMutable = true;
};

DataProberImageBuilder.prototype.getListeners = function() {
    return this.mouseListener;
};

DataProberImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

DataProberImageBuilder.prototype.onProbeLineReady = function(callback) {
    return this.on(PROBE_LINE_READY_TOPIC, callback);
};

DataProberImageBuilder.prototype.onProbeChange = function(callback) {
    return this.on(PROBE_CHANGE_TOPIC, callback);
};

DataProberImageBuilder.prototype.onRenderMethodChange = function(callback) {
    return this.on(RENDER_METHOD_CHANGE_TOPIC, callback);
};

DataProberImageBuilder.prototype.onCrosshairVisibilityChange = function(callback) {
    return this.on(CROSSHAIR_VISIBILITY_CHANGE_TOPIC, callback);
};

DataProberImageBuilder.prototype.destroy = function() {
    this.off();

    this.lutChangeSubscription.unsubscribe();
    this.lutChangeSubscription = null;

    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.queryDataModel = null;

    this.bgCanvas.destroy();
    this.bgCanvas = null;

    this.workImage = null;
};

// Method meant to be used with the WidgetFactory
DataProberImageBuilder.prototype.getControlWidgets = function() {
    return [ "LookupTableWidget", "ProbeControl", "QueryDataModelWidget" ];
};

DataProberImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

DataProberImageBuilder.prototype.getLookupTable = function() {
    return this.lookupTableManager.getLookupTable(this.getField());
};

DataProberImageBuilder.prototype.getLookupTableManager = function() {
    return this.lookupTableManager;
};
