var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    max                   = require('mout/object/max'),
    Monologue             = require('monologue.js'),
    IMAGE_READY_TOPIC     = 'image-ready';

// CompositeImageBuilder Object ----------------------------------------------

export default function CompositeImageBuilder(queryDataModel, pipelineModel) {
    this.queryDataModel = queryDataModel;
    this.pipelineModel = pipelineModel;
    this.metadata = queryDataModel.originalData.CompositePipeline;
    this.pushMethod = 'pushToFrontAsBuffer';
    this.compositeMap = {};
    this.offsetMap = {};
    this.spriteSize = max(this.metadata.offset);
    this.query = null;
    this.composite = null;

    this.bgCanvas = new CanvasOffscreenBuffer(this.metadata.dimensions[0], this.metadata.dimensions[1]);
    this.fgCanvas = null;

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.sprite = data.sprite;
        this.composite = data.composite.data['pixel-order'].split('+');
        this.updateCompositeMap(this.query, this.composite);
        this.render();
    });

    this.pipelineSubscription = this.pipelineModel.onChange((data, envelope) => {
        this.setPipelineQuery(data);
    });
    this.setPipelineQuery(this.pipelineModel.getPipelineQuery());
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(CompositeImageBuilder);

CompositeImageBuilder.prototype.updateOffsetMap = function(query) {
    var layers = this.metadata.layers,
        count = layers.length,
        offsets = this.metadata.offset;

    this.offsetMap = {};
    this.compositeMap = {};
    for(var idx = 0; idx < count; idx++) {
        var fieldCode = query[idx*2 + 1];
        if(fieldCode === '_') {
            this.offsetMap[layers[idx]] = -1;
        } else {
            this.offsetMap[layers[idx]] = this.spriteSize - offsets[layers[idx] + fieldCode];
        }
    }
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
    if(query === null || composite === null) {
        return;
    }
    var compositeArray = composite,
        count = compositeArray.length,
        map = this.compositeMap;

    while(count--) {
        var key = compositeArray[count];
        if(key[0] === '@') {
            // Skip pixels
        } else if (map.hasOwnProperty(key)) {
            // Already computed
        } else {
            var offset = -1;
            for(var i=0, size=key.length; i<size; i++) {
                offset = this.offsetMap[key[i]];
                if(offset !== -1) {
                    i = size;
                }
            }
            map[key] = offset;
        }
    }
}

CompositeImageBuilder.prototype.render = function() {
    if(!this.sprite) {
        this.queryDataModel.fetchData();
        return;
    }
    if(this.query === null) {
        return;
    }

    var ctx = this.bgCanvas.get2DContext(),
        dimensions = this.metadata.dimensions,
        offset = 1,
        compositeArray = this.composite,
        count = compositeArray.length,
        x = 0, y = 0, modulo = dimensions[0];

    function addToX(delta) {
        x += delta;
        y += Math.floor(x/modulo);
        x %= modulo;
    }

    if(this.sprite.image.complete) {
        // Free callback if any
        if(this.sprite.image.onload) {
            this.sprite.image.onload = null;
        }

        ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
        for(var idx = 0; idx < count; idx++) {
            var key = compositeArray[idx];
            if(key[0] === '@') {
                // Shift (x,y)
                addToX(Number(key.replace(/@/,'+')));
            } else {
                offset = this.compositeMap[key];
                if(offset !== -1) {
                    ctx.drawImage(this.sprite.image, x, y + dimensions[1]*offset, 1, 1, x, y, 1, 1);
                }
                addToX(1);
            }
        }

        this.pushToFront(dimensions[0], dimensions[1]);
    } else {
        this.sprite.image.onload = (() => {
            this.render();
        });
    }

};

CompositeImageBuilder.prototype.pushToFront = function(width, height) {
    this[this.pushMethod](width, height);
};

CompositeImageBuilder.prototype.pushToFrontAsImage = function(width, height) {
    var ctx = null;

    // Make sure we have a foreground buffer
    if(this.fgCanvas) {
        this.fgCanvas.size(width, height);
    } else {
        this.fgCanvas = new CanvasOffscreenBuffer(width, height);
    }

    ctx = this.fgCanvas.get2DContext();
    ctx.drawImage(this.bgCanvas.el, 0, 0, width, height, 0, 0, width, height);

    var readyImage = { url: this.fgCanvas.toDataURL(), type: 'composite' };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

CompositeImageBuilder.prototype.pushToFrontAsBuffer = function(width, height) {
    var readyImage = {
            canvas: this.bgCanvas.el,
            imageData: this.bgCanvas.el.getContext('2d').getImageData(0, 0, width, height),
            area: [0, 0, width, height],
            outputSize: [width, height],
            type: 'composite'
        };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

CompositeImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

CompositeImageBuilder.prototype.destroy = function() {
    this.off(IMAGE_READY_TOPIC);

    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.pipelineSubscription.unsubscribe();
    this.pipelineSubscription = null;

    this.queryDataModel = null;

    this.bgCanvas.destroy();
    this.bgCanvas = null;
};

CompositeImageBuilder.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
};

// Method meant to be used with the WidgetFactory
CompositeImageBuilder.prototype.getControlWidgets = function() {
    return [ "CompositeControl", "QueryDataModelWidget" ];
};

CompositeImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

CompositeImageBuilder.prototype.getPipelineModel = function() {
    return this.pipelineModel;
};

