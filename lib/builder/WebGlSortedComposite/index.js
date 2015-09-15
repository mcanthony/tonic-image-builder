var Monologue         = require('monologue.js'),
    GPUCompositor = require('./sorted-volume-compositor-gpu'),
    CPUCompositor = require('./sorted-volume-compositor-cpu'),
    IMAGE_READY_TOPIC = 'image-ready',
    COLOR_CHANGE_TOPIC = 'color-change',
    LUT_NAME = 'VolumeScalar';

export default function WebGLSortedVolumeImageBuilder(queryDataModel, lookupTableManager) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.SortedComposite;
    this.opacities = [];
    this.colors = [];
    this.eqCallback = null;
    this.useIntensity = false;

    this.lookupTableManager = lookupTableManager;
    this.originalRange = [ this.metadata.scalars[0], this.metadata.scalars[ this.metadata.scalars.length - 1]];
    this.lutTextureData = new Uint8Array(this.metadata.layers * 4);
    this.dataQuery = { name: 'data_fetch', categories: [] };

    this.compositors = [
        new CPUCompositor(queryDataModel, this, this.lutTextureData),
        new GPUCompositor(queryDataModel, this, this.lutTextureData)
    ];
    this.compositor = this.compositors[1];
    this.controlWidgets = [ "VolumeControlWidget", "QueryDataModelWidget" ];

    this.resetOpacities();

    // Add Lut
    lookupTableManager.addFields({ VolumeScalar: [0, 1] }, this.queryDataModel.originalData.LookupTables);
    this.lookupTable = lookupTableManager.getLookupTable(LUT_NAME);
    this.lutChangeSubscription = this.lookupTable.onChange( (data, envelope) => {
        this.colors = [];
        for(var idx = 0; idx < this.metadata.layers; idx++) {
            var color = this.lookupTable.getColor(this.metadata.scalars[idx]);

            this.lutTextureData[idx*4] = color[0] * 255;
            this.lutTextureData[idx*4+1] = color[1] * 255;
            this.lutTextureData[idx*4+2] = color[2] * 255;

            this.colors.push('rgb(' + [this.lutTextureData[idx*4], this.lutTextureData[idx*4 + 1], this.lutTextureData[idx*4 + 2]].join(',') + ')');
        }
        this.emit(COLOR_CHANGE_TOPIC);
        this.render();
    });
    // Force the filling of the color texture
    this.lookupTable.setScalarRange(this.originalRange[0], this.originalRange[1]);

    // Relay normal data fetch to query based on
    this.relayDataFetchSubscription = this.queryDataModel.onDataChange(() => {
        this.update();
    });

    this.dataSubscription = queryDataModel.on('data_fetch', (data, envelope) => {
        this.compositor.updateData(data);
        this.render();
    });
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(WebGLSortedVolumeImageBuilder);

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.update = function() {
    if(this.useIntensity) {
        this.dataQuery.categories = ['_', 'intensity'];
    } else {
        this.dataQuery.categories = ['_'];
    }

    this.queryDataModel.fetchData(this.dataQuery);
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.updateOpacities = function(array) {
    this.opacities = [].concat(array);

    for(var idx = 0; idx < this.metadata.layers; idx++) {
        this.lutTextureData[idx*4 + 3] = array[idx] * 255;
    }
    this.render();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.render = function() {
    this.compositor.render();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.destroy = function() {
  this.dataSubscription.unsubscribe();
  this.dataSubscription = null;

  this.compositors.forEach((c) => {
      c.destroy();
  });
  this.compositors = [];
  this.compositor = null;

  this.lutChangeSubscription.unsubscribe();
  this.lutChangeSubscription = null;

  this.relayDataFetchSubscription.unsubscribe();
  this.relayDataFetchSubscription = null;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.IMAGE_READY_TOPIC = IMAGE_READY_TOPIC;

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.onColorChange = function(callback) {
    return this.on(COLOR_CHANGE_TOPIC, callback);
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
}

// --------------------------------------------------------------------------
// Method meant to be used with the WidgetFactory
WebGLSortedVolumeImageBuilder.prototype.getControlWidgets = function() {
    return this.controlWidgets;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getEqualizerLevels = function() {
    return this.opacities;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getEqualizerCallback = function() {
    if(!this.eqCallback) {
        this.eqCallback = (opacity) => {
            this.updateOpacities(opacity);
        };
    }
    return this.eqCallback;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.resetOpacities = function() {
    var opacityStep = 1.0 / this.metadata.layers,
        opacity = 0.0;

    this.opacities = [];
    while(this.opacities.length < this.metadata.layers) {
        opacity += opacityStep;
        this.opacities.push(opacity);
    }

    this.updateOpacities(this.opacities);
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getOriginalRange = function() {
    return this.originalRange;
}


// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getLookupTableManager = function() {
    return this.lookupTableManager;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getLookupTable = function() {
    return this.lookupTable;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.isIntensityUsed = function() {
    return this.useIntensity;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.toggleIntensityUsage = function() {
    this.useIntensity = !this.useIntensity;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.setIntensityUsage = function(bool) {
    this.useIntensity = bool;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.useGPU = function(bool) {
    this.compositor = this.compositors[bool ? 1 : 0];
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.getColors = function() {
    return this.colors;
}

