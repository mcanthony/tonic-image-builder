var CanvasOffscreenBuffer = require('../CanvasOffscreenBuffer'),
    Monologue             = require('monologue.js'),
    IMAGE_READY_TOPIC     = 'image-ready',
    dataMapping = {
        renderXY: {
            idx: [0,1],
            hasChange: function(probe, x, y, z) {
                return (probe[2] !== z);
            }
        },
        renderXZ: {
            idx: [0,2],
            hasChange: function(probe, x, y, z) {
                return (probe[1] !== y);
            }
        },
        renderZY: {
            idx: [2,1],
            hasChange: function(probe, x, y, z) {
                return (probe[0] !== x);
            }
        }
    };

// DataProberImageBuilder Object ----------------------------------------------

export default function DataProberImageBuilder(queryDataModel, pushAsBuffer, lutManager) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.InSituDataProber;
    this.lookupTableManager = lutManager;
    this.fieldIndex = 0;
    this.renderMethod = 'renderXY';
    this.lastImageStack = null;
    this.workImage = new Image();
    this.probeXYZ = [
        Math.floor(this.metadata.dimensions[0] / 2),
        Math.floor(this.metadata.dimensions[1] / 2),
        Math.floor(this.metadata.dimensions[2] / 2)
    ];
    this.setField(this.metadata.fields[this.fieldIndex]);
    this.pushMethod = pushAsBuffer ? 'pushToFrontAsBuffer' : 'pushToFrontAsImage';

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
    this.dataSubscription = queryDataModel.on('_', (data, envelope) => {
        this.lastImageStack = data;
        this.render();
    });

    this.lutChangeSubscription = this.lookupTableManager.onChange( (data, envelope) => {
        this.update();
    });
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(DataProberImageBuilder);

DataProberImageBuilder.prototype.setPushMethodAsBuffer = function() {
    this.pushMethod = 'pushToFrontAsBuffer';
};

DataProberImageBuilder.prototype.setPushMethodAsImage = function() {
    this.pushMethod = 'pushToFrontAsImage';
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
            img.onload = callback;
        }
    } else {
        this.workImage.onload = callback;
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
        this.queryDataModel.fetchData();
    } else {
        console.log('quick render');
        this.probeXYZ = [x,y,z];
        var dimensions = this.metadata.dimensions,
            spacing = this.metadata.spacing;
        this.pushToFront(dimensions[0], dimensions[1], spacing[0], spacing[1], this.probeXYZ[idx[0]], this.probeXYZ[idx[1]]);
    }

};

DataProberImageBuilder.prototype.getProbe = function() {
    return this.probeXYZ;
};

DataProberImageBuilder.prototype.render = function() {
    if(!this.lastImageStack) {
        return;
    }

    this[this.renderMethod]();
};

DataProberImageBuilder.prototype.pushToFront = function(width, height, scaleX, scaleY, lineX, lineY) {
    this[this.pushMethod](width, height, scaleX, scaleY, lineX, lineY);
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
        crosshair: [lineX, lineY],
        type: this.renderMethod
    };

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
            self.applyLookupTable(dimensions[0], dimensions[2]);
            self.pushToFront(dimensions[0], dimensions[2], spacing[0], spacing[2], xyz[0], xyz[2]);
        }
    }

    if(activeLine--) {
        self.getImage(activeLine, processLine);
    }
};

DataProberImageBuilder.prototype.applyLookupTable = function(width, height) {
    var ctx = this.bgCanvas.get2DContext(),
        fieldName = this.getField(),
        lut = this.lookupTableManager.getLookupTable(fieldName),
        pixels = ctx.getImageData(0, 0, width, height),
        pixBuffer = pixels.data,
        size = pixBuffer.length,
        idx = 0,
        fieldRange = this.metadata.ranges[fieldName],
        delta = fieldRange[1] - fieldRange[0];

    if(lut) {
        while(idx < size) {
             var value = (pixBuffer[idx] + (256*pixBuffer[idx+1]) + (65536*pixBuffer[idx+2])) / 16777216,
                 color = lut.getColor(value * delta + fieldRange[0]);

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

DataProberImageBuilder.prototype.getLookupTable = function() {
    return this.lookupTableManager.getLookupTable(this.getField());
};

DataProberImageBuilder.prototype.getLookupTableManager = function() {
    return this.lookupTableManager;
};

DataProberImageBuilder.prototype.getFields = function() {
    return this.metadata.fields;
};

DataProberImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

DataProberImageBuilder.prototype.TopicImageReady = function() {
    return IMAGE_READY_TOPIC;
};

DataProberImageBuilder.prototype.destroy = function() {
    this.off(IMAGE_READY_TOPIC);

    this.lutChangeSubscription.unsubscribe();
    this.lutChangeSubscription = null;

    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.queryDataModel = null;

    this.bgCanvas.destroy();
    this.bgCanvas = null;

    this.workImage = null;
};
