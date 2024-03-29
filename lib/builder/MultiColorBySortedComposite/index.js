var Monologue = require('monologue.js'),
    ColorByHelper = require('./colorByHelper'),
    CPUCompositor = require('./cpu-compositor'),
    GPUCompositor = require('./gpu-compositor'),
    IMAGE_READY_TOPIC = 'image-ready',
    FETCH_DATA_TOPIC = 'data_to_fetch';

export default function MultiColorBySortedCompositeImageBuilder(queryDataModel, lookupTableManager, pipelineModel) {
    // State flags that let UI present the proper controls
    this.handleRecord = true;
    this.handleExploration = false;

    this.queryDataModel = queryDataModel;
    this.metadata = queryDataModel.originalData.SortedComposite;
    this.opacities = [];
    this.eqCallback = null;
    this.useIntensity = true;
    this.useNormals = false;
    this.pipelineModel = pipelineModel;
    this.lookupTableManager = lookupTableManager;

    // Update LookupTableManager with data range
    this.lookupTableManager.addFields(this.metadata.ranges, this.queryDataModel.originalData.LookupTables);

    // Need to have the LookupTable created
    this.colorHelper = new ColorByHelper(this.metadata.pipeline, queryDataModel.originalData.CompositePipeline.fields, lookupTableManager);

    this.lookupTableManager.updateActiveLookupTable(this.metadata.pipeline[0].colorBy[0].name);
    this.dataQuery = { name: FETCH_DATA_TOPIC, categories: [] };

    this.compositors = [
        new CPUCompositor(queryDataModel, this, this.colorHelper),
        new GPUCompositor(queryDataModel, this, this.colorHelper)
    ];
    this.compositor = this.compositors[1];

    this.controlWidgets = [ "LookupTableManagerWidget", "CompositeControl", "QueryDataModelWidget" ];
    if (this.metadata.light && this.metadata.light.indexOf('normal') >= 0) {
        this.controlWidgets = [ "LookupTableManagerWidget", "LightPropertiesWidget", "CompositeControl", "QueryDataModelWidget" ];
        if (this.metadata.light.indexOf('intensity') < 0) {
            this.useNormals = true;
        }
    }

    this.resetOpacities();

    // Relay normal data fetch to query based on
    this.relayDataFetchSubscription = this.queryDataModel.onDataChange(() => {
        this.update();
    });

    this.dataSubscription = queryDataModel.on(FETCH_DATA_TOPIC, (data, envelope) => {
        this.colorHelper.updateData(data);
        this.compositor.updateData(data);
        this.render();
    });

    this.pipelineSubscription = this.pipelineModel.onChange((data, envelope) => {
        this.colorHelper.updatePipeline(data);
        this.update();
    });
    this.colorHelper.updatePipeline(this.pipelineModel.getPipelineQuery());

    this.lutChangeSubscription = this.lookupTableManager.onChange((data, envelope) => {
        this.render();
    });

    this.opacitySubscription = this.pipelineModel.onOpacityChange((data, envelope) => {
        this.updateOpacities(data);
    });
}

// --------------------------------------------------------------------------
// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(MultiColorBySortedCompositeImageBuilder);

// ----------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getDimensions = function() {
    return this.metadata.dimensions;
}

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.update = function() {
    if (this.useNormals) {
        this.dataQuery.categories = ['_', 'normal'].concat(this.colorHelper.getCategories());
    } else if (this.useIntensity) {
        this.dataQuery.categories = ['_', 'intensity'].concat(this.colorHelper.getCategories());
    } else {
        this.dataQuery.categories = ['_'].concat(this.colorHelper.getCategories());
    }

    this.queryDataModel.fetchData(this.dataQuery);
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.updateOpacities = function(array) {
    this.opacities = [].concat(array);
    this.colorHelper.updateAlphas(this.opacities);
    this.render();
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.render = function() {
    this.compositor.render();
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.destroy = function() {
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

  this.pipelineSubscription.unsubscribe();
  this.pipelineSubscription = null;

  this.opacitySubscription.unsubscribe();
  this.opacitySubscription = null;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.IMAGE_READY_TOPIC = IMAGE_READY_TOPIC;

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.onColorChange = function(callback) {
    return this.on(COLOR_CHANGE_TOPIC, callback);
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
};

// --------------------------------------------------------------------------
// Method meant to be used with the WidgetFactory
MultiColorBySortedCompositeImageBuilder.prototype.getControlWidgets = function() {
    return this.controlWidgets;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.resetOpacities = function() {
    this.opacities = [];
    while(this.opacities.length < this.metadata.layers) {
        this.opacities.push(1.0);
    }

    this.updateOpacities(this.opacities);
};


// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getLookupTableManager = function() {
    return this.lookupTableManager;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.isIntensityUsed = function() {
    return this.useIntensity;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.toggleIntensityUsage = function() {
    this.useIntensity = !this.useIntensity;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.setIntensityUsage = function(bool) {
    this.useIntensity = bool;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.useGPU = function(bool) {
    this.compositor = this.compositors[bool ? 1 : 0];
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getColors = function() {
    return this.colors;
};

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getPipelineModel = function() {
    return this.pipelineModel;
};

// --------------------------------------------------------------------------
// Lighting Widget called methods
// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getLightingEnabled = function() {
    return this.useNormals;
}

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.setLightingEnabled = function(lightingEnabled) {
    this.useNormals = lightingEnabled;
    this.update();
}

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.getLightProperties = function() {
    return this.compositor.getLightProperties();
}

// --------------------------------------------------------------------------

MultiColorBySortedCompositeImageBuilder.prototype.setLightProperties = function(lightProps) {
    this.compositor.setLightProperties(lightProps);
    this.render();
}
