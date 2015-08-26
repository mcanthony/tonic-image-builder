var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    Monologue             = require('monologue.js'),
    IMAGE_READY_TOPIC     = 'image-ready';

// DepthImageBuilder Object ----------------------------------------------
// Convert a UInt8Array with 1 byte per pixel to a filled gray scale canvas
// value(i) => pixel(value(i), value(i), value(i), 255)

export default function DepthImageBuilder(queryDataModel, dataName) {
    this.queryDataModel = queryDataModel;
    this.dataName = dataName;
    this.depthArray = null;

    this.bgCanvas = new CanvasOffscreenBuffer(this.metadata.dimensions[0], this.metadata.dimensions[1]);
    this.fgCanvas = null;

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.depthArray = data[this.dataName];
        this.render();
    });
}

// Add Observer pattern using Monologue.js
Monologue.mixInto(DepthImageBuilder);

DepthImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
};

DepthImageBuilder.prototype.render = function() {
    if(!this.depthArray) {
        this.queryDataModel.fetchData();
        return;
    }

    var ctx = this.bgCanvas.get2DContext(),
        dimensions = this.metadata.dimensions,
        imageData = this.bgCanvas.el.getContext('2d').getImageData(0, 0, width, height),
        pixels = imageData.data,
        width = dimensions[0],
        height = dimensions[1],
        size = width * height;

    // Fill bgCanvas with depth
    for(var i = 0; i < size; i++) {
        var value = this.depthArray[i];
        pixels[i*4 + 0] = value;
        pixels[i*4 + 1] = value;
        pixels[i*4 + 2] = value;
        pixels[i*4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    var readyImage = {
            canvas: this.bgCanvas.el,
            area: [0, 0, width, height],
            outputSize: [width, height],
            builder: this
        };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

DepthImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

DepthImageBuilder.prototype.destroy = function() {
    this.off(IMAGE_READY_TOPIC);

    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.queryDataModel = null;

    this.bgCanvas.destroy();
    this.bgCanvas = null;
};

DepthImageBuilder.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
};

// Method meant to be used with the WidgetFactory
DepthImageBuilder.prototype.getControlWidgets = function() {
    return [ "QueryDataModelWidget" ];
};

DepthImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};
