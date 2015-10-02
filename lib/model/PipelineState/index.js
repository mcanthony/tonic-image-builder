const Monologue = require('monologue.js'),
      CHANGE_TOPIC = 'pipeline.change',
      OPACITY_CHANGE_TOPIC = 'opacity.change',
      LAYER_CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default class CompositePipelineModel {

    constructor(jsonData, hasOpacity = false) {
        this.originalData = jsonData;
        this.visibilityState = {};
        this.activeState = {};
        this.editMode = {};
        this.activeColors = {};
        this.noTrigger = true;
        this.handleOpacity = hasOpacity;
        this.opacityMap = {};
        this.nbLayers = 0;

        // Handle default pipeline if any
        let pipelineQuery = jsonData.CompositePipeline.default_pipeline;
        function isLayerVisible(layers) {
            if(!pipelineQuery || layers.length > 1) {
                return true;
            }

            let layerIdx = LAYER_CODE.indexOf(layers[0]);

            return (pipelineQuery[layerIdx*2+1] !== '_');
        }

        // Fill visibility and activate all layers
        jsonData.CompositePipeline.pipeline.forEach(item => {
            this.setLayerVisible(item.ids.join(''), true);
        });
        jsonData.CompositePipeline.layers.forEach(item => {
            this.activeState[item] = isLayerVisible(item);
            this.activeColors[item] = jsonData.CompositePipeline.layer_fields[item][0];

            // Initialize opacity
            this.opacityMap[item] = 100.0;
            this.nbLayers++;
        });

        this.noTrigger = false;
        this.triggerChange();
    }

    // ------------------------------------------------------------------------

    onChange(listener) {
        return this.on(CHANGE_TOPIC, listener);
    }

    // ------------------------------------------------------------------------

    onOpacityChange(listener) {
        return this.on(OPACITY_CHANGE_TOPIC, listener);
    }

    // ------------------------------------------------------------------------

    TopicChange() {
        return CHANGE_TOPIC;
    }

    // ------------------------------------------------------------------------

    triggerChange() {
        if(this.noTrigger) {
            return;
        }

        let pipelineQuery = this.getPipelineQuery();
        this.emit(CHANGE_TOPIC, pipelineQuery);
    }

    // ------------------------------------------------------------------------

    isLayerActive(layerId) {
        return this.activeState[layerId];
    }

    // ------------------------------------------------------------------------

    setLayerActive(layerId, active) {
        if(this.activeState[layerId] !== active) {
            this.activeState[layerId] = active;
            this.triggerChange();
        }
    }

    // ------------------------------------------------------------------------

    toggleLayerActive(layerId) {
        this.activeState[layerId] = !this.activeState[layerId];
        this.triggerChange();
    }

    // ------------------------------------------------------------------------

    isLayerVisible(layerId) {
        return this.visibilityState[layerId];
    }

    // ------------------------------------------------------------------------

    setLayerVisible(layerId, visible) {
        if(this.visibilityState[layerId] !== visible) {
            this.visibilityState[layerId] = visible;
            let count = layerId.length;
            while(count--) {
                this.visibilityState[layerId[count]] = visible;
            }
            this.triggerChange();
        }
    }

    // ------------------------------------------------------------------------

    toggleLayerVisible(layerId) {
        this.setLayerVisible(layerId, !this.visibilityState[layerId]);
    }

    // ------------------------------------------------------------------------

    toggleEditMode(layerId) {
        this.editMode[layerId] = !this.editMode[layerId];
        this.triggerChange();
    }

    // ------------------------------------------------------------------------

    isLayerInEditMode(layerId) {
        for(let key in this.editMode) {
            if(this.editMode[key] && key.indexOf(layerId) !== -1) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------------------

    getColor(layerId) {
        return this.originalData.CompositePipeline.layer_fields[layerId[0]];
    }

    // ------------------------------------------------------------------------

    getColorToLabel(colorCode) {
        return this.originalData.CompositePipeline.fields[colorCode];
    }

    // ------------------------------------------------------------------------

    isActiveColor(layerId, colorCode) {
        return this.activeColors[layerId[0]] === colorCode;
    }

    // ------------------------------------------------------------------------

    setActiveColor(layerId, colorCode) {
        let count = layerId.length;
        while(count--) {
            this.activeColors[layerId[count]] = colorCode;
        }
        this.triggerChange();
    }

    // ------------------------------------------------------------------------
    // Return the encoding of the pipeline configuration

    getPipelineQuery() {
        let query = "";
        this.originalData.CompositePipeline.layers.forEach(item => {
            let color = this.isLayerActive(item) && this.isLayerVisible(item) ? this.activeColors[item] : '_';
            query += item;
            query += color;
        });
        return query;
    }

    // ------------------------------------------------------------------------

    getPipelineDescription() {
       return this.originalData.CompositePipeline.pipeline;
    }

    // ------------------------------------------------------------------------

    getOpacity(layerCode) {
        return this.opacityMap[layerCode];
    }

    // ------------------------------------------------------------------------

    hasOpacity() {
        return this.handleOpacity;
    }

    // ------------------------------------------------------------------------

    setOpacity(layerCode, alpha) {
        if(this.opacityMap[layerCode] !== alpha) {
            this.opacityMap[layerCode] = alpha;

            let opacityArray = [];
            for(let i = 0; i < this.nbLayers; ++i) {
                opacityArray.push(this.opacityMap[LAYER_CODE[i]] / 100.0);
            }

            this.emit(OPACITY_CHANGE_TOPIC, opacityArray);
        }

    }

}

// Add Observer pattern using Monologue.js
Monologue.mixInto(CompositePipelineModel);
