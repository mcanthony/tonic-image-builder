var Monologue         = require('monologue.js'),
    GPUCompositor = require('./sorted-volume-compositor-gpu'),
    CPUCompositor = require('./sorted-volume-compositor-cpu'),
    IMAGE_READY_TOPIC = 'image-ready',
    LUT_NAME = 'VolumeScalar';

export default function WebGLSortedVolumeImageBuilder(queryDataModel, lookupTableManager) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.SortedComposite;
    this.opacities = [];
    this.eqCallback = null;
    this.useIntensity = false;

    this.lookupTableManager = lookupTableManager;
    this.originalRange = [ this.metadata.scalars[0], this.metadata.scalars[ this.metadata.scalars.length - 1]];
    this.lutTextureData = new Uint8Array(this.metadata.layers * 3);
    this.dataQuery = { name: 'data_fetch', categories: [] };

    this.compositors = [
        new CPUCompositor(queryDataModel, this, this.lutTextureData),
        // new GPUCompositor(queryDataModel, this, this.lutTextureData)
    ];
    this.compositor = this.compositors[0];
    this.controlWidgets = [ "VolumeControlWidget", "QueryDataModelWidget" ];

    this.resetOpacities();

    // Add Lut
    this.lookupTable = lookupTableManager.addLookupTable(LUT_NAME, [0, 1]);
    this.lutChangeSubscription = this.lookupTable.onChange( (data, envelope) => {
        for(var idx = 0; idx < this.metadata.layers; idx++) {
            var color = this.lookupTable.getColor(this.metadata.scalars[idx]);
            this.lutTextureData[idx*3] = color[0] * 255;
            this.lutTextureData[idx*3+1] = color[1] * 255;
            this.lutTextureData[idx*3+2] = color[2] * 255;
        }
        this.render();
    });
    // Force the filling of the color texture
    this.lookupTable.setScalarRange(this.originalRange[0], this.originalRange[1]);

    // Relay normal data fetch to query based on
    this.relayDataFetchSubscription = this.queryDataModel.onDataChange(() => {
        this.update();
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

    this.compositors.forEach((c) => {
        c.updateOpacities(this.opacities);
    });

    this.render();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.render = function() {
    this.compositor.render();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.destroy = function() {
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

    this.compositors.forEach((c) => {
      c.updateOpacities(this.opacities);
    });
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

