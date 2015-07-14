import CanvasOffscreenBuffer from '../CanvasOffscreenBuffer';
import max from 'mout/object/max'

// CompositeImageBuilder Object ----------------------------------------------

export default function CompositeImageBuilder(queryDataModel, pushAsBuffer) {
    var self = this;

    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.CompositePipeline;
    this.pushMethod = pushAsBuffer ? 'pushToFrontAsBuffer' : 'pushToFrontAsImage';
    this.onReadyListeners = [];
    this.listeners = {};
    this.listenerCount = 0;
    this.compositeMap = {};
    this.offsetMap = {};
    this.spriteSize = max(this.metadata.offset);

    this.bgCanvas = new CanvasOffscreenBuffer(this.metadata.dimensions[0], this.metadata.dimensions[1]);
    this.fgCanvas = null;


    function dataListener(data) {
        self.sprite = data.sprite;
        self.composite = data.composite.data['pixel-order'].split('+');
        self.updateCompositeMap(self.query, self.composite);
        self.render();
    }

    this.listenerId = queryDataModel.addDataListener(dataListener);
}

CompositeImageBuilder.prototype.updateOffsetMap = function(query) {
    var layers = this.metadata.layers,
        count = layers.length,
        offsets = this.metadata.offset;

    this.offsetMap = {};
    for(var idx = 0; idx < count; idx++) {
        var fieldCode = query[idx*2 + 1];
        if(fieldCode === '_') {
            this.offsetMap[layers[idx]] = -1;
        } else {
            this.offsetMap[layers[idx]] = this.spriteSize - offsets[layers[idx] + fieldCode];
        }
    }

    console.log(this.offsetMap);
};

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
    if(this.query !== query) {
        this.query = query;
        this.updateOffsetMap(query);
        this.updateCompositeMap(query, this.composite)
        this.render();
    }
};

CompositeImageBuilder.prototype.updateCompositeMap = function(query, composite) {
    console.log("updateCompositeMap");
    var compositeArray = this.composite,
        count = compositeArray.length,
        map = this.compositeMap = {};

    while(count--) {
        var key = compositeArray[count];
        if(key[0] === '@') {
            // Skip pixels
        } else if (map.hasOwnProperty(key)) {
            // Already computed
        } else {
            var offset = -1;
            for(var i=0, size=key.length; i<size && offset !== -1; i++) {
                offset = this.offsetMap[key[i]];
            }
            map[key] = offset;
        }
    }
}

CompositeImageBuilder.prototype.render = function() {
    if(!this.sprite) {
        queryDataModel.fetchData();
        return;
    }

    console.log('render');

    var self = this,
        ctx = this.bgCanvas.get2DContext(),
        dimensions = this.metadata.dimensions,
        offset = 1;

    var compositeArray = this.composite,
        count = compositeArray.length,
        x = 0, y = 0, modulo = dimensions[0];

    for(var idx = 0; idx < count; idx++) {
        var key = compositeArray[idx];
        if(key[0] === '@') {
            // Shift (x,y)
            var delta = Number(key.replace(/@/,'+'));
            console.log('skip ' + delta);
            x += delta;
            y += Math.floor(x/modulo);
            x %= modulo;
        } else {
            offset = this.compositeMap[key];
            if(offset !== -1) {
                console.log('draw pixel ' + x + ' ' + y);
                ctx.drawImage(this.sprite.image, x, y + dimensions[1]*offset, 1, 1, x, y, 1, 1);
            } else {
                console.log('skip 1');
                x++;
                if(x%modulo === 0) {
                    x = 0;
                    y++;
                }
            }
        }
    }

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
