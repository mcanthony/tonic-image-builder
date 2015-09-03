var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    Monologue = require('monologue.js'),
    IMAGE_READY_TOPIC = 'image-ready',
    maskLut = {
        getColor: function(value) {
            return value ? [0,0,0,1] : [0,0,0,0];
        }
    };

// ----------------------------------------------------------------------------

export default function FloatImageImageBuilder(queryDataModel, lutManager) {
    this.queryDataModel = queryDataModel;
    this.light = 200;
    this.meshColor = [50, 50, 50];
    this.lookupTableManager = lutManager;
    this.metadata = queryDataModel.originalData.FloatImage;
    this.layers = this.metadata.layers;
    this.dimensions = this.metadata.dimensions;
    this.bgCanvas = new CanvasOffscreenBuffer(this.dimensions[0], this.dimensions[1]);

    // Update LookupTableManager with data range
    this.lookupTableManager.addFields(this.metadata.ranges);

    // Handle events
    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.layers.forEach((item) => {
            var dataId = item.name + '_' + item.array,
                dataLight = item.name + '__light',
                dataMesh = item.name + '__mesh';
            if(item.active && data[dataId]) {
                item.data = new window[item.type](data[dataId].data);
                item.light = new Uint8Array(data[dataLight].data);
                if(data[dataMesh]) {
                    item.mesh = new Uint8Array(data[dataMesh].data);
                }
            }
        });
        this.render();
    });
    this.lutChangeSubscription = this.lookupTableManager.onChange( (data, envelope) => {
        this.render();
    });
}

// ----------------------------------------------------------------------------

Monologue.mixInto(FloatImageImageBuilder);

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.render = function() {
    var ctx = this.bgCanvas.get2DContext(),
        width = this.dimensions[0],
        height = this.dimensions[1],
        size = width * height,
        imageData = ctx.createImageData(width, height),
        pixels = imageData.data;

    ctx.clearRect(0, 0, width, height);
    this.layers.forEach( (layer) => {
        if(layer.active) {
            var lut = layer.array ? this.lookupTableManager.getLookupTable(layer.array) : maskLut;
            for(var i = 0; i < size; i++) {
                var color = lut.getColor(layer.data[i]),
                    light = layer.light ? (layer.light[i] ? layer.light[i] - this.light : 0): 0;

                if(color[3]) {
                    pixels[i*4  ] = color[0] * 255 + light;
                    pixels[i*4+1] = color[1] * 255 + light;
                    pixels[i*4+2] = color[2] * 255 + light;
                    pixels[i*4+3] = color[3] * 255;

                    if(layer.hasMesh && layer.meshActive && layer.mesh[i]) {
                        pixels[i*4  ] = this.meshColor[0];
                        pixels[i*4+1] = this.meshColor[1];
                        pixels[i*4+2] = this.meshColor[2];
                    }
                }
            }
        }
    });
    ctx.putImageData(imageData, 0, 0);

    var readyImage = {
        canvas: this.bgCanvas.el,
        area: [0, 0, width, height],
        outputSize: [width, height],
        builder: this
    };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.destroy = function() {
    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.lutChangeSubscription.unsubscribe();
    this.lutChangeSubscription = null;

    this.bgCanvas.destroy();
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
}

// ----------------------------------------------------------------------------
// Method meant to be used with the WidgetFactory

FloatImageImageBuilder.prototype.getControlWidgets = function() {
    return ["LookupTableManagerWidget", "FloatImageControl", "QueryDataModelWidget"];
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getLookupTableManager = function() {
    return this.lookupTableManager;
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getLayers = function() {
    return this.layers;
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.setLight = function(lightValue) {
    if(this.light !== lightValue) {
        this.light = lightValue;
        this.render();
    }
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getLight = function() {
    return this.light;
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.setMeshColor = function(r,g,b) {
    if(this.meshColor[0] !== r && this.meshColor[1] !== g && this.meshColor[2] !== b) {
        this.meshColor = [r,g,b];
        this.render();
    }
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getMeshColor = function() {
    return this.meshColor;
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.updateLayerVisibility = function(name, visible) {
    var array = this.layers,
        count = array.length;

    while(count--) {
        if(array[count].name === name) {
            array[count].active = visible;
            return this.render();
        }
    }
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.updateMaskLayerVisibility = function(name, visible) {
    var array = this.layers,
        count = array.length;

    while(count--) {
        if(array[count].name === name) {
            array[count].meshActive = visible;
            return this.render();
        }
    }
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.updateLayerColorBy = function(name, arrayName) {
    var array = this.layers,
        count = array.length;

    while(count--) {
        if(array[count].name === name) {
            array[count].array = arrayName;
            return this.update();
        }
    }
}
