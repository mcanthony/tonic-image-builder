var Monologue = require('monologue.js'),
    CHANGE_TOPIC = 'pipeline.change';

export default function CompositePipelineModel(jsonData) {
    this.originalData = jsonData;
    this.visibilityState = {};
    this.activeState = {};
    this.editMode = {};
    this.activeColors = {};
    this.noTrigger = true;

    // Handle default pipeline if any
    var pipelineQuery = jsonData.CompositePipeline.default_pipeline;
    function isLayerVisible(layers) {
        if(!pipelineQuery || layers.length > 1) {
            return true;
        }

        var layerCode = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            layerIdx = layerCode.indexOf(layers[0]);

        return (pipelineQuery[layerIdx*2+1] !== '_');
    }

    // Fill visibility and activate all layers
    jsonData.CompositePipeline.pipeline.forEach(item => {
        this.setLayerVisible(item.ids.join(''), isLayerVisible(item.ids));
    });
    jsonData.CompositePipeline.layers.forEach(item => {
        this.activeState[item] = true;
        this.activeColors[item] = jsonData.CompositePipeline.layer_fields[item][0];
    });

    this.noTrigger = false;
    this.triggerChange();
}

// Add Observer pattern using Monologue.js
Monologue.mixInto(CompositePipelineModel);

CompositePipelineModel.prototype.onChange = function(listener) {
    return this.on(CHANGE_TOPIC, listener);
}

CompositePipelineModel.prototype.TopicChange = function() {
    return CHANGE_TOPIC;
}

CompositePipelineModel.prototype.triggerChange = function() {
    if(this.noTrigger) {
        return;
    }

    var pipelineQuery = this.getPipelineQuery();
    this.emit(CHANGE_TOPIC, pipelineQuery);
}

CompositePipelineModel.prototype.isLayerActive = function(layerId) {
    return this.activeState[layerId];
}

CompositePipelineModel.prototype.setLayerActive = function(layerId, active) {
    if(this.activeState[layerId] !== active) {
        this.activeState[layerId] = active;
        this.triggerChange();
    }
}

CompositePipelineModel.prototype.toggleLayerActive = function(layerId) {
    this.activeState[layerId] = !this.activeState[layerId];
    this.triggerChange();
}

CompositePipelineModel.prototype.isLayerVisible = function(layerId) {
    return this.visibilityState[layerId];
}

CompositePipelineModel.prototype.setLayerVisible = function(layerId, visible) {
    if(this.visibilityState[layerId] !== visible) {
        this.visibilityState[layerId] = visible;
        var count = layerId.length;
        while(count--) {
            this.visibilityState[layerId[count]] = visible;
        }
        this.triggerChange();
    }
}

CompositePipelineModel.prototype.toggleLayerVisible = function(layerId) {
    this.setLayerVisible(layerId, !this.visibilityState[layerId]);
}

CompositePipelineModel.prototype.toggleEditMode = function(layerId) {
    this.editMode[layerId] = !this.editMode[layerId];
    this.triggerChange();
}


CompositePipelineModel.prototype.isLayerInEditMode = function(layerId) {
    for(var key in this.editMode) {
        if(this.editMode[key] && key.indexOf(layerId) !== -1) {
            return true;
        }
    }
    return false;
}

CompositePipelineModel.prototype.getColor = function(layerId) {
    return this.originalData.CompositePipeline.layer_fields[layerId[0]];
}

CompositePipelineModel.prototype.getColorToLabel = function(colorCode) {
    return this.originalData.CompositePipeline.fields[colorCode];
}

CompositePipelineModel.prototype.isActiveColor = function(layerId, colorCode) {
    return this.activeColors[layerId[0]] === colorCode;
}

CompositePipelineModel.prototype.setActiveColor = function(layerId, colorCode) {
    var count = layerId.length;
    while(count--) {
        this.activeColors[layerId[count]] = colorCode;
    }
    this.triggerChange();
}

// Return the encoding of the pipeline configuration
CompositePipelineModel.prototype.getPipelineQuery = function() {
    var query = "";
    this.originalData.CompositePipeline.layers.forEach(item => {
        var color = this.isLayerActive(item) && this.isLayerVisible(item) ? this.activeColors[item] : '_';
        query += item;
        query += color;
    });
    return query;
}

CompositePipelineModel.prototype.getPipelineDescription = function() {
    return this.originalData.CompositePipeline.pipeline;
};

