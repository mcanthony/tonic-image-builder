import CanvasOffscreenBuffer from '../CanvasOffscreenBuffer';

// CompositeImageBuilder Object ----------------------------------------------

export default function CompositeImageBuilder(queryDataModel, pushAsBuffer) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.CompositePipeline;
    this.pushMethod = pushAsBuffer ? 'pushToFrontAsBuffer' : 'pushToFrontAsImage';
    this.onReadyListeners = [];
    this.listeners = {};
    this.listenerCount = 0;

    this.bgCanvas = new CanvasOffscreenBuffer(this.metadata.dimensions[0], this.metadata.dimensions[1]);
    this.fgCanvas = null;

    var self = this;
    function dataListener(data) {
        self.sprite = data.sprite;
        self.composite = data.composite;

        self.render();
    }

    this.listenerId = queryDataModel.addDataListener(dataListener);
}

CompositeImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
};

CompositeImageBuilder.prototype.setPushMethodAsBuffer = function() {
    this.pushMethod = 'pushToFrontAsBuffer';
};

CompositeImageBuilder.prototype.setPushMethodAsImage = function() {
    this.pushMethod = 'pushToFrontAsImage';
};

CompositeImageBuilder.prototype.setPipelineQuery = function(query) {
    this.query = query;
};

CompositeImageBuilder.prototype.render = function() {
    if(!this.sprite) {
        return;
    }

    var self = this,
        ctx = this.bgCanvas.get2DContext(),
        dimensions = this.metadata.dimensions,
        offset = 1;

    ctx.drawImage(this.sprite.image, 0, dimensions[1]*offset, dimensions[0], dimensions[1], 0, 0, dimensions[0], dimensions[1]);
    this.pushToFront(dimensions[0], dimensions[1]);
};

CompositeImageBuilder.prototype.pushToFront = function(width, height) {
    this[this.pushMethod](width, height);
};

CompositeImageBuilder.prototype.pushToFrontAsImage = function(width, height) {
    var ctx = null,
        readyList = this.onReadyListeners,
        count = readyList.length;

    // Make sure we have a foreground buffer
    if(this.fgCanvas) {
        this.fgCanvas.size(width, height);
    } else {
        this.fgCanvas = new CanvasOffscreenBuffer(width, height);
    }

    ctx = this.fgCanvas.get2DContext();
    ctx.drawImage(this.bgCanvas.el, 0, 0, width, height, 0, 0, width, height);

    var readyImage = { url: this.fgCanvas.toDataURL(), type: 'composite' };

    while(count--) {
       readyList[count](readyImage);
    }
};

CompositeImageBuilder.prototype.pushToFrontAsBuffer = function(width, height) {
    var readyList = this.onReadyListeners,
        count = readyList.length,
        readyImage = {
            canvas: this.bgCanvas.el,
            imageData: this.bgCanvas.el.getContext('2d').getImageData(0, 0, width, height),
            area: [0, 0, width, height],
            outputSize: [width, height],
            type: 'composite'
        };

    while(count--) {
       readyList[count](readyImage);
    }
};

CompositeImageBuilder.prototype.addImageReadyListener = function(callback) {
    var listenerId = 'image-ready-listener-' + (++this.listenerCount);
    this.listeners[listenerId] = callback;
    this.onReadyListeners.push(callback);
    return listenerId;
};

CompositeImageBuilder.prototype.removeImageReadyListener = function(listenerId) {
    delete this.listeners[listenerId];
    this.onReadyListeners = [];
    for(var key in this.listeners) {
        this.onReadyListeners.push(this.listeners[key]);
    }
};

CompositeImageBuilder.prototype.delete = function() {
    this.queryDataModel.removeDataListener(this.listenerId);
    this.queryDataModel = null;

    this.bgCanvas.delete();
    this.bgCanvas = null;

    this.listenerId = null;
};
