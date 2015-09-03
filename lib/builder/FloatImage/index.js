var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    Monologue = require('monologue.js'),
    IMAGE_READY_TOPIC = 'image-ready',
    TIME_DATA_READY = 'time-data-ready';

// ----------------------------------------------------------------------------

export default function FloatImageImageBuilder(queryDataModel, lutManager) {
    this.queryDataModel = queryDataModel;
    this.timeDataQueryDataModel = queryDataModel.clone();
    this.timeData = { data: [], count: 0, pending: false };
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
    this.fetchSubscription = queryDataModel.onStateChange( () => { this.update(); });
    this.dataSubscription = queryDataModel.on('pipeline_data', (data, envelope) => {
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

    // Handle time data
    this.timeDataSubscription = this.timeDataQueryDataModel.on('pipeline_data', (data, envelope) => {
        this.timeData.data.push(data);
        if(this.timeData.data.length === this.timeData.count) {
            this.timeData.pending = false;
        }
    });
}

// ----------------------------------------------------------------------------

Monologue.mixInto(FloatImageImageBuilder);

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getCategories = function() {
    var categories = [];

    this.layers.forEach( (layer) => {
        if(layer.active) {
            categories.push([layer.name, layer.array].join('_'));
            categories.push(layer.name + '__light');
            if(layer.hasMesh && layer.meshActive) {
                categories.push(layer.name + '__mesh');
            }
        }
    });

    return categories;
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.update = function() {
    var categories = this.getCategories();
    this.queryDataModel.fetchData({name: 'pipeline_data', categories});
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.fetchTimeData = function() {
    var categories = this.getCategories(),
        query = this.queryDataModel.getQuery();

    // Prevent concurrent data fetching for time
    if(this.timeData.pending || !this.timeDataQueryDataModel.getValues('time')) {
        return;
    } else {
        this.timeData.pending = true;
    }

    // Reset time data
    this.timeData.data = [];
    this.timeData.count = this.timeDataQueryDataModel.getValues('time').length;

    // Synch the time query data model
    for(var key in query) {
        this.timeDataQueryDataModel.setValue(key, query[key]);
    }

    this.timeDataQueryDataModel.first('time');
    do {
        this.timeDataQueryDataModel.fetchData({name: 'pipeline_data', categories});
    } while(this.timeDataQueryDataModel.next('time'));
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getTimeChart = function(x, y) {
    if(this.timeData.data.length === 0) {
        this.fetchTimeData();
        return null;
    }

    // Find the layer under (x,y)
    var width = this.dimensions[0],
        height = this.dimensions[1],
        idx = (height - y - 1) * width + x,
        arrayType = '',
        field = '',
        layer = '';

    this.layers.forEach( (layer) => {
        if(layer.active && !isNaN(layer.data[idx])) {
            arrayType = layer.type;
            field = layer.array;
            layer = layer.name;
        }
    });

    // Build chart data information
    var timeValues = this.timeDataQueryDataModel.getValues('time'),
        dataValues = [],
        chartData = { xRange: [ timeValues[0] , timeValues[timeValues.length - 1]], fields: [ {name: field, data: dataValues}] },
        timeSize = this.timeData.data.length;

    for(var i = 0; i < timeSize; i++) {
        var floatArray = new window[arrayType](this.timeData.data[i].data);
        dataValues.push(floatArray[idx]);
    }

    this.emit(TIME_DATA_READY, chartData);
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.render = function() {
    var ctx = this.bgCanvas.get2DContext(),
        width = this.dimensions[0],
        height = this.dimensions[1],
        size = width * height,
        imageData = ctx.createImageData(width, height),
        pixels = imageData.data;

    function flipY(idx) {
        var x = idx % width,
            y = Math.floor(idx / width);

        return (height - y - 1)*width + x;
    }

    ctx.clearRect(0, 0, width, height);
    this.layers.forEach( (layer) => {
        if(layer.active) {
            var lut = this.lookupTableManager.getLookupTable(layer.array);
            for(var i = 0; i < size; i++) {
                var flipedY = flipY(i),
                    color = lut.getColor(layer.data[flipedY]),
                    light = layer.light ? (layer.light[flipedY] ? layer.light[flipedY] - this.light : 0): 0;

                if(color[3]) {
                    pixels[i*4  ] = color[0] * 255 + light;
                    pixels[i*4+1] = color[1] * 255 + light;
                    pixels[i*4+2] = color[2] * 255 + light;
                    pixels[i*4+3] = color[3] * 255;

                    if(layer.hasMesh && layer.meshActive && layer.mesh[flipedY]) {
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

FloatImageImageBuilder.prototype.onTimeDataReady = function(callback) {
    return this.on(TIME_DATA_READY, callback);
}

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.destroy = function() {
    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.fetchSubscription.unsubscribe();
    this.fetchSubscription = null;

    this.timeDataSubscription.unsubscribe();
    this.timeDataSubscription = null;

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
        this.update();
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
            return this.update();
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
            return this.update();
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
