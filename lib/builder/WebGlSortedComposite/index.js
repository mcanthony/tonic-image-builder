var Monologue         = require('monologue.js'),
    Compositor = require('./sorted-volume-compositor'),
    IMAGE_READY_TOPIC = 'image-ready',
    LUT_NAME = 'VolumeScalar';

export default function WebGLSortedVolumeImageBuilder(queryDataModel, lookupTableManager) {
    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.SortedComposite;
    this.opacities = [];
    this.eqCallback = null;
    this.lookupTableManager = lookupTableManager;
    this.originalRange = [ this.metadata.scalars[0], this.metadata.scalars[ this.metadata.scalars.length - 1]];
    this.lutTextureData = new Uint8Array(this.metadata.layers * 3);

    while(this.opacities.length < this.metadata.layers) {
        this.opacities.push(1.0);
    }

    this.compositor = new Compositor(queryDataModel, this);
    this.controlWidgets = this.compositor.WIDGETS || [ "LookupTableWidget", "EqualizerWidget", "QueryDataModelWidget" ];

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
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(WebGLSortedVolumeImageBuilder);

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.updateOpacities = function(array) {
    this.opacities = [].concat(array);
    this.render();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.render = function() {
    this.compositor.render();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.destroy = function() {
  this.compositor.destroy();
  this.compositor = null;

  this.lutChangeSubscription.unsubscribe();
  this.lutChangeSubscription = null;
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
