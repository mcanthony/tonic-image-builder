var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    Monologue = require('monologue.js'),
    equals = require('mout/src/object/equals'),
    IMAGE_READY_TOPIC = 'image-ready',
    PROBE_CHANGE_TOPIC = 'probe-change',
    TIME_DATA_READY = 'time-data-ready';

// ----------------------------------------------------------------------------

export default function FloatImageImageBuilder(queryDataModel, lutManager) {
    this.queryDataModel = queryDataModel;
    this.timeDataQueryDataModel = queryDataModel.clone();
    this.light = 200;
    this.meshColor = [50, 50, 50];
    this.lookupTableManager = lutManager;
    this.metadata = queryDataModel.originalData.FloatImage;
    this.layers = this.metadata.layers;
    this.dimensions = this.metadata.dimensions;
    this.timeData = {
        data: [],
        pending: false
    };
    this.timeProbe = {
        x: this.dimensions[0] / 2,
        y: this.dimensions[1] / 2,
        query: this.timeDataQueryDataModel.getQuery(),
        enabled: false,
        draw: true,
        pending: false,
        forceUpdate: false,
        tIdx: this.queryDataModel.getIndex('time') || 0,
        updateValue: () => {
            this.timeProbe.value = this.timeProbe.dataValues ? this.timeProbe.dataValues[this.timeProbe.tIdx] : (this.timeProbe.pending ? 'Fetching...' : '');
        },
        triggerChange: () => {
            this.timeProbe.forceUpdate = false;
            this.timeProbe.updateValue();
            this.emit(PROBE_CHANGE_TOPIC, this.timeProbe);
        }
    };
    this.bgCanvas = new CanvasOffscreenBuffer(this.dimensions[0], this.dimensions[1]);

    // Update LookupTableManager with data range
    this.lookupTableManager.addFields(this.metadata.ranges, this.queryDataModel.originalData.LookupTables);

    // Handle events
    this.fetchSubscription = queryDataModel.onStateChange(() => {
        if(this.timeProbe.tIdx !== this.queryDataModel.getIndex('time')) {
            this.timeProbe.tIdx = this.queryDataModel.getIndex('time');
            this.timeProbe.triggerChange();
        } else {
            this.render();
        }
        this.update();
    });
    this.dataSubscription = queryDataModel.on('pipeline_data', (data, envelope) => {
        this.layers.forEach((item) => {
            var dataId = item.name + '_' + item.array,
                dataLight = item.name + '__light',
                dataMesh = item.name + '__mesh';
            if (item.active && data[dataId]) {
                item.data = new window[item.type](data[dataId].data);
                item.light = new Uint8Array(data[dataLight].data);
                if (data[dataMesh]) {
                    item.mesh = new Uint8Array(data[dataMesh].data);
                }
            }
        });
        this.render();
    });
    this.lutChangeSubscription = this.lookupTableManager.onChange((data, envelope) => {
        this.render();
    });

    // Handle time data
    this.timeDataSubscription = this.timeDataQueryDataModel.on('pipeline_data', (data, envelope) => {
        this.timeData.data.push(data);
        if (this.timeData.data.length < this.timeDataQueryDataModel.getSize('time')) {
            this.timeDataQueryDataModel.next('time');
            this.timeData.pending = true;
            this.timeProbe.pending = true;
            var categories = this.getCategories();
            this.timeDataQueryDataModel.fetchData({
                name: 'pipeline_data',
                categories
            });
        } else {
            this.timeData.pending = false;
            this.timeProbe.pending = false;
            if(this.timeProbe.enabled) {
                this.getTimeChart();
            }
            this.timeProbe.triggerChange();
        }
    });
}

// ----------------------------------------------------------------------------

Monologue.mixInto(FloatImageImageBuilder);

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getCategories = function() {
    var categories = [];

    this.layers.forEach((layer) => {
        if (layer.active) {
            categories.push([layer.name, layer.array].join('_'));
            categories.push(layer.name + '__light');
            if (layer.hasMesh && layer.meshActive) {
                categories.push(layer.name + '__mesh');
            }
        }
    });

    return categories;
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.update = function() {
    var categories = this.getCategories();
    this.queryDataModel.fetchData({
        name: 'pipeline_data',
        categories
    });
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.fetchTimeData = function() {
    var categories = this.getCategories(),
        query = this.queryDataModel.getQuery();

    // Prevent concurrent data fetching for time
    if (this.timeData.pending || !this.timeDataQueryDataModel.getValues('time')) {
        return;
    } else {
        this.timeData.pending = true;
        this.timeProbe.pending = true;
        this.timeProbe.triggerChange();
    }

    // Reset time data
    this.timeData.data = [];
    this.timeProbe.query = query;

    // Synch the time query data model
    for (var key in query) {
        this.timeDataQueryDataModel.setValue(key, query[key]);
    }

    this.timeDataQueryDataModel.first('time');
    this.timeDataQueryDataModel.fetchData({
        name: 'pipeline_data',
        categories
    });
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getTimeChart = function(x, y) {
    var probeHasChanged = !this.timeProbe.enabled || this.timeProbe.forceUpdate;
    this.timeProbe.enabled = true;
    // this.timeProbe.value = '';
    if(x === undefined && y === undefined) {
        x = this.timeProbe.x;
        y = this.timeProbe.y;
    } else {
        probeHasChanged = probeHasChanged || this.timeProbe.x !== x || this.timeProbe.y !== y;
        this.timeProbe.x = x;
        this.timeProbe.y = y;
    }

    var qA = this.queryDataModel.getQuery(),
        qB = this.timeProbe.query;

    // Time is irrelevant
    qB.time = qA.time;
    if (this.timeData.data.length === 0 || !equals(qA, qB)) {
        this.fetchTimeData();
        return;
    }

    // Find the layer under (x,y)
    var width = this.dimensions[0],
        height = this.dimensions[1],
        idx = (height - y - 1) * width + x,
        arrayType = '',
        field = null,
        layerName = null;

    this.layers.forEach((layer) => {
        if (layer.active && !isNaN(layer.data[idx])) {
            arrayType = layer.type;
            field = layer.array;
            layerName = layer.name;
        }
    });

    // Make sure the loaded data is the one we need to plot
    if(layerName && this.timeProbe.layer !== layerName && field && this.timeProbe.field !== field) {
        this.timeProbe.layer = layerName;
        this.timeProbe.field = field;

        if(this.timeProbe.layer && this.timeProbe.field) {
            this.fetchTimeData();
        }
        return;
    }

    // Build chart data information
    var timeValues = this.timeDataQueryDataModel.getValues('time'),
        dataValues = [],
        chartData = {
            xRange: [ Number(timeValues[0]), Number(timeValues[timeValues.length - 1])],
            fields: [{
                name: field,
                data: dataValues
            }]
        },
        timeSize = this.timeData.data.length;

    if(field && this.lookupTableManager.getLookupTable(field)) {
        chartData.fields[0].range = this.lookupTableManager.getLookupTable(field).getScalarRange();
    }

    // Keep track of the chart values
    this.timeProbe.dataValues = dataValues;
    this.timeProbe.tIdx = this.queryDataModel.getIndex('time');

    if(layerName && field && this.timeData.data[0][layerName + '_' + field]) {
        for (var i = 0; i < timeSize; i++) {
            var floatArray = new window[arrayType](this.timeData.data[i][layerName + '_' + field].data);
            dataValues.push(floatArray[idx]);
        }
    } else if(layerName && field && !this.timeData.data[0][layerName + '_' + field]){
        this.fetchTimeData();
    }

    this.emit(TIME_DATA_READY, chartData);
    if(probeHasChanged) {
        this.timeProbe.triggerChange();
    }
    this.render();
};

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

        return (height - y - 1) * width + x;
    }

    ctx.clearRect(0, 0, width, height);
    this.layers.forEach((layer) => {
        if (layer.active) {
            var lut = this.lookupTableManager.getLookupTable(layer.array);
            for (var i = 0; i < size; i++) {
                var flipedY = flipY(i),
                    color = lut.getColor(layer.data[flipedY]),
                    light = layer.light ? (layer.light[flipedY] ? layer.light[flipedY] - this.light : 0) : 0;

                if (color[3]) {
                    pixels[i * 4] = color[0] * 255 + light;
                    pixels[i * 4 + 1] = color[1] * 255 + light;
                    pixels[i * 4 + 2] = color[2] * 255 + light;
                    pixels[i * 4 + 3] = color[3] * 255;

                    if (layer.hasMesh && layer.meshActive && layer.mesh && layer.mesh[flipedY]) {
                        pixels[i * 4] = this.meshColor[0];
                        pixels[i * 4 + 1] = this.meshColor[1];
                        pixels[i * 4 + 2] = this.meshColor[2];
                    }
                }
            }
        }
    });
    ctx.putImageData(imageData, 0, 0);

    // Update draw flag based on query
    var currentQuery = this.queryDataModel.getQuery();
    this.timeProbe.query.time = currentQuery.time; // We don't care about time
    this.timeProbe.draw = equals(this.timeProbe.query, currentQuery);

    // Draw time probe if enabled
    if(this.timeProbe.enabled && this.timeProbe.draw) {
        let x = this.timeProbe.x;
        let y = this.timeProbe.y;
        let delta = 10;

        ctx.beginPath();
        ctx.moveTo(x - delta, y);
        ctx.lineTo(x + delta, y);
        ctx.moveTo(x, y - delta);
        ctx.lineTo(x, y + delta);

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    }

    var readyImage = {
        canvas: this.bgCanvas.el,
        area: [0, 0, width, height],
        outputSize: [width, height],
        builder: this
    };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.onTimeDataReady = function(callback) {
    return this.on(TIME_DATA_READY, callback);
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.onProbeChange = function(callback) {
    return this.on(PROBE_CHANGE_TOPIC, callback);
};

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
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
};

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
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.setLight = function(lightValue) {
    if (this.light !== lightValue) {
        this.light = lightValue;
        this.render();
    }
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getLight = function() {
    return this.light;
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getTimeProbe = function() {
    return this.timeProbe;
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.setMeshColor = function(r, g, b) {
    if (this.meshColor[0] !== r && this.meshColor[1] !== g && this.meshColor[2] !== b) {
        this.meshColor = [r, g, b];
        this.update();
    }
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.getMeshColor = function() {
    return this.meshColor;
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.updateLayerVisibility = function(name, visible) {
    var array = this.layers,
        count = array.length;

    while (count--) {
        if (array[count].name === name) {
            array[count].active = visible;
            this.update();
            if(this.timeProbe.enabled) {
                this.timeProbe.forceUpdate = true;
                this.getTimeChart();
            }
            return;
        }
    }
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.updateMaskLayerVisibility = function(name, visible) {
    var array = this.layers,
        count = array.length;

    while (count--) {
        if (array[count].name === name) {
            array[count].meshActive = visible;
            return this.update();
        }
    }
};

// ----------------------------------------------------------------------------

FloatImageImageBuilder.prototype.updateLayerColorBy = function(name, arrayName) {
    var array = this.layers,
        count = array.length;

    while (count--) {
        if (array[count].name === name) {
            array[count].array = arrayName;
            this.update();
            if(this.timeProbe.enabled) {
                this.getTimeChart();
            }
            return;
        }
    }
};
