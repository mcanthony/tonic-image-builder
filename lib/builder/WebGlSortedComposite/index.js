var Monologue         = require('monologue.js'),
    Compositor = require('./sorted-volume-compositor'),
    IMAGE_READY_TOPIC = 'image-ready';

export default function WebGLSortedVolumeImageBuilder(queryDataModel) {
    this.queryDataModel = queryDataModel;
    this.compositePipeline = queryDataModel.originalData.CompositePipeline;
    this.query = null;

    this.compositor = new Compositor(queryDataModel, this);
    this.controlWidgets = this.compositor.WIDGETS || [ "QueryDataModelWidget" ];
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(WebGLSortedVolumeImageBuilder);

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.render = function() {
    if(this.query) {
      this.compositor.render();
    }
}

// --------------------------------------------------------------------------

WebGLSortedVolumeImageBuilder.prototype.destroy = function() {
  this.compositor.destroy();
  this.compositor = null;
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
