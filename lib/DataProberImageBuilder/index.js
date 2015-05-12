import CanvasOffscreenBuffer from '../CanvasOffscreenBuffer';

// DataProberImageBuilder Object ----------------------------------------------

export default function DataProberImageBuilder(queryDataModel) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.InSituDataProber;
    this.fieldIndex = 0;
    this.renderMethod = 'renderXY';
    this.lastImageStack = null;
    this.workImage = new Image();
    this.onReadyListeners = [];
    this.listeners = {};
    this.listenerCount = 0;
    this.probeXYZ = [
        Math.floor(this.metadata.dimensions[0] / 2),
        Math.floor(this.metadata.dimensions[1] / 2),
        Math.floor(this.metadata.dimensions[2] / 2)
    ];

    this.setField(this.metadata.fields[this.fieldIndex]);

    var maxSize = 0;
    for(var i = 0; i < 3; ++i) {
        var currentSize = this.metadata.dimensions[i];
        maxSize = (maxSize < currentSize) ? currentSize : maxSize;
    }
    this.bgCanvas = new CanvasOffscreenBuffer(maxSize, maxSize);
    this.fgCanvas = new CanvasOffscreenBuffer(this.metadata.dimensions[0], this.metadata.dimensions[1]);

    // Create data handler
    var self = this;
    function onDataReady(data) {
        self.lastImageStack = data;
        self.render();
    }
    this.listenerId = queryDataModel.addDataListener(onDataReady);
}


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
    this.workImage.onload = callback;
    this.workImage.src = this.lastImageStack[this.metadata.slices[Math.floor(slice/this.metadata.sprite_size)]].url;
};

DataProberImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
};

DataProberImageBuilder.prototype.setProbe = function(x, y, z) {
    this.probeXYZ = [x,y,z];
    this.queryDataModel.fetchData();
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
    var destWidth = Math.floor(width * scaleX),
        destHeight = Math.floor(height * scaleY),
        readyList = this.onReadyListeners,
        count = readyList.length,
        ctx = this.fgCanvas.get2DContext();

    this.fgCanvas.size(destWidth, destHeight);
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

    while(count--) {
       readyList[count](readyImage);
    }
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
        lut = this.lutManager ? this.lutManager.getLookupTable(this.queryDataModel.getValue('field')) : null,
        pixels = ctx.getImageData(0, 0, width, height),
        pixBuffer = pixels.data,
        size = pixBuffer.length,
        idx = 0;

    if(lut) {
        while(idx < size) {
             var value = (pixBuffer[idx] + (256*pixBuffer[idx+1]) + (65536*pixBuffer[idx+2])) / 16777216,
                 color = lut(value);

             pixBuffer[idx]   = Math.floor(color[0]);
             pixBuffer[idx+1] = Math.floor(color[1]);
             pixBuffer[idx+2] = Math.floor(color[2]);

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

DataProberImageBuilder.prototype.setLookupTableManager = function(lutManager) {
    this.lutManager = lutManager;
};

DataProberImageBuilder.prototype.addImageReadyListener = function(callback) {
    var listenerId = 'image-ready-listener-' + (++this.listenerCount);
    this.listeners[listenerId] = callback;
    this.onReadyListeners.push(callback);
    return listenerId;
};

DataProberImageBuilder.prototype.removeImageReadyListener = function(listenerId) {
    delete this.listeners[listenerId];
    this.onReadyListeners = [];
    for(var key in this.listeners) {
        this.onReadyListeners.push(this.listeners[key]);
    }
};

DataProberImageBuilder.prototype.delete = function() {
    this.queryDataModel.removeDataListener(this.listenerId);
    this.queryDataModel = null;

    this.bgCanvas.delete();
    this.bgCanvas = null;

    this.workImage = null;
    this.lutManager = null;
    this.listenerId = null;
};
