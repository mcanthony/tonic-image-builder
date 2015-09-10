var Monologue         = require('monologue.js'),
    Factory = require('./CompositorFactory'),
    IMAGE_READY_TOPIC = 'image-ready';

export default function WebGlImageBuidler(queryDataModel, pipelineModel, lookupTableManager) {
    this.queryDataModel = queryDataModel;
    this.pipelineModel = pipelineModel;
    this.lookupTableManager = lookupTableManager;
    this.compositePipeline = queryDataModel.originalData.CompositePipeline;
    this.query = null;

    this.compositor = Factory.createCompositor(queryDataModel.originalData.type, {queryDataModel, lookupTableManager, imageBuilder: this});
    this.controlWidgets = this.compositor.WIDGETS || [ "CompositeControl", "QueryDataModelWidget" ];

    this.setPipelineQuery(this.pipelineModel.getPipelineQuery());
    this.pipelineSubscription = this.pipelineModel.onChange((data, envelope) => {
        this.setPipelineQuery(data);
    });
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(WebGlImageBuidler);

// Update the composite pipeline query
// Sample query: "BACADAGBHBIB" means color layers B, C, and D by field A,
// color layers G, H, and I by field B
WebGlImageBuidler.prototype.setPipelineQuery = function(query) {
  if(this.query !== query) {
      this.query = query;
      this.compositor.updateQuery(query);
      this.render();
  }
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.update = function() {
    this.queryDataModel.fetchData();
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.render = function() {
    if(this.query) {
      this.compositor.render();
    }
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.destroy = function() {
  this.pipelineSubscription.unsubscribe();
  this.pipelineSubscription = null;

  this.compositor.destroy();
  this.compositor = null;
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.IMAGE_READY_TOPIC = IMAGE_READY_TOPIC;

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
}


// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.setLightProperties = function(lightProps) {
  this.compositor.setLightProperties(lightProps);
}

// --------------------------------------------------------------------------
// Method meant to be used with the WidgetFactory
WebGlImageBuidler.prototype.getControlWidgets = function() {
    return this.controlWidgets;
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.getPipelineModel = function() {
    return this.pipelineModel;
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.getLookupTableManager = function() {
    return this.lookupTableManager;
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.getField = function() {
    return this.lookupTableManager.getActiveField();
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.getLightProperties = function() {
  return this.compositor.getLightProperties();
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.getLightingEnabled = function() {
  return this.compositor.getLightingEnabled();
}

// --------------------------------------------------------------------------

WebGlImageBuidler.prototype.setLightingEnabled = function(lightingEnabled) {
  return this.compositor.setLightingEnabled(lightingEnabled);
}
