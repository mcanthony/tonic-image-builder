var encoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function createColorLookupConst(lut, value) {
    return function(idx) {
        return lut.getColor(value);
    }
}

function createColorLookup(lut, floatMap, layer, color) {
    return function(idx) {
        var value = floatMap[layer][color][idx];
        return lut.getColor(value);
    }
}

export default class ColorByHelper {
    constructor(layers, fieldCodes, lookupTableManager) {
        this.nbLayers = layers.length;
        this.fieldCodes = fieldCodes;
        this.lookupTableManager = lookupTableManager;
        this.layerFloatData = {};
        this.layerVisible = {};
        this.layerAlpha = {};
        this.layerColorBy = {};
        this.layerGetColor = {};
        this.categories = [];

        // Fill function map to get color
        for(var layerIdx = 0; layerIdx < this.nbLayers; layerIdx++) {
            this.layerFloatData[encoding[layerIdx]] = {};
            this.layerVisible[encoding[layerIdx]] = 1.0;
            this.layerAlpha[encoding[layerIdx]] = 1.0;
            this.layerGetColor[encoding[layerIdx]] = {};

            var array = layers[layerIdx].colorBy,
                count = array.length;
            while(count--) {
                var colorBy = array[count],
                    layerCode = encoding[layerIdx],
                    colorName = colorBy.name,
                    lut = this.lookupTableManager.getLookupTable(colorBy.name);

                if(colorBy.type === 'const') {
                    this.layerGetColor[layerCode][colorName] = createColorLookupConst(lut, colorBy.value);
                } else if(colorBy.type === 'field') {
                    this.layerGetColor[layerCode][colorName] = createColorLookup(lut, this.layerFloatData, layerCode, colorName);
                }
            }
        }
    }

    updateData(data) {
        for(var name in data) {
            if(name.indexOf('_') !== -1) {
                var splitName = name.split('_'),
                    layerName = encoding[Number(splitName[0])],
                    colorBy = splitName[1];

                this.layerFloatData[layerName][colorBy] = new Float32Array(data[name].data);
            }
        }
    }

    updatePipeline(query) {
        this.categories = [];
        for(var layerIdx = 0; layerIdx < this.nbLayers; layerIdx++) {
            var layerCode = encoding[layerIdx],
                colorCode = query[layerIdx*2+1];

            if(colorCode === '_') {
                this.layerVisible[layerCode] = 0.0;
            } else {
                this.layerVisible[layerCode] = 1.0;
                this.layerColorBy[layerCode] = this.fieldCodes[colorCode];
                this.categories.push([layerIdx, this.fieldCodes[colorCode]].join('_'));
            }
        }
    }

    updateAlphas(alphas) {
        for(var i = 0; i < this.nbLayers; i++) {
            this.layerAlpha[encoding[i]] = alphas[i];
        }
    }

    hasNoContent(layerIdx) {
        var layerCode = encoding[layerIdx],
            alpha = this.layerAlpha[layerCode] * this.layerVisible[layerCode];
        return (alpha === 0);
    }

    getColor(layerIdx, pixelIdx) {
        var layerCode = encoding[layerIdx],
            color = this.layerGetColor[layerCode][this.layerColorBy[layerCode]](pixelIdx),
            alpha = this.layerAlpha[layerCode] * this.layerVisible[layerCode];

        return [color[0] * 255, color[1] * 255, color[2] * 255, color[3] * alpha];
    }

    getCategories() {
        return this.categories;
    }

    getLayerColorByName(layerIdx) {
        return this.layerColorBy[encoding[layerIdx]];
    }

    getLayerVisible(layerIdx) {
        return this.layerVisible[encoding[layerIdx]];
    }

    getLayerLut(layerIdx) {
        return this.lookupTableManager.getLookupTable(this.layerColorBy[encoding[layerIdx]]);
    }

    getLayerFloatData(layerIdx) {
        var layerName = encoding[layerIdx];
        return this.layerFloatData[layerName][this.layerColorBy[layerName]];
    }

    getLayerAlpha(layerIdx) {
        return this.layerAlpha[encoding[layerIdx]];
    }
}

