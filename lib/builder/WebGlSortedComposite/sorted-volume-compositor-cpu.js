var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer');

export default function SortedVolumeCompositor(queryDataModel, imageBuilder, colorTable) {
    this.queryDataModel = queryDataModel;
    this.imageBuilder = imageBuilder;
    this.metadata = this.queryDataModel.originalData.SortedComposite;
    this.orderData = null;
    this.alphaData = null;
    this.intensityData = null;
    this.numLayers = this.metadata.layers;
    this.colorTable = colorTable;

    this.width = this.metadata.dimensions[0];
    this.height = this.metadata.dimensions[1];
    this.bgCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.imageBuffer = this.bgCanvas.get2DContext().createImageData(this.width, this.height);
}

// --------------------------------------------------------------------------

SortedVolumeCompositor.prototype.updateData = function(data) {
    this.orderData = new Uint8Array(data.order.data);
    this.alphaData = new Uint8Array(data.alpha.data);
    if (data.intensity) {
      this.intensityData = new Uint8Array(data.intensity.data);
    } else {
      this.intensityData = null;
    }
};

// --------------------------------------------------------------------------

SortedVolumeCompositor.prototype.setLayerColors = function(colorTable) {
  this.colorTable = colorTable;
};

// --------------------------------------------------------------------------

SortedVolumeCompositor.prototype.render = function() {
    if (!this.alphaData || !this.orderData || !this.colorTable) {
        return null;
    }

    var imageSize = this.width * this.height,
        pixels = this.imageBuffer.data,
        height = this.height,
        width = this.width,
        ctx = this.bgCanvas.get2DContext();

    // Reset pixels
    if(pixels.fill) {
        pixels.fill(0);
    } else {
        var count = width * height * 4;
        while(count--) {
            pixels[count] = 0;
        }
    }

    // Just iterate through all the layers in the data for now
    for (var drawIdx = 0; drawIdx < this.numLayers; drawIdx++) {
        for(var y = 0; y < this.height; y++) {
            for(var x = 0; x < this.width; x++) {
                var idx = this.width * y + x,
                    flipIdx = ((height - y - 1)*width + x),
                    layerIdx = this.orderData[drawIdx * imageSize + idx],
                    multiplier = this.colorTable[layerIdx*4 + 3] / 255.0,
                    alphB = this.alphaData[drawIdx * imageSize + idx] / 255.0,
                    intensity = 1.0;

                if(this.intensityData) {
                    intensity = this.intensityData[drawIdx * imageSize + idx] / 255.0;
                }

                // Blend
                var alphA = pixels[flipIdx*4 + 3] / 255.0,
                    alphANeg = 1.0 - alphA,
                    rgbA = [ pixels[flipIdx*4], pixels[flipIdx*4 + 1], pixels[flipIdx*4 + 2]],
                    rgbB = [
                        this.colorTable[layerIdx*4  ] * intensity * alphB * multiplier * alphANeg,
                        this.colorTable[layerIdx*4+1] * intensity * alphB * multiplier * alphANeg,
                        this.colorTable[layerIdx*4+2] * intensity * alphB * multiplier * alphANeg
                    ],
                    alphOut = alphA + (alphB * multiplier * (1.0 - alphA));

                pixels[flipIdx*4  ] = ((rgbA[0] * alphA) + rgbB[0]) / alphOut;
                pixels[flipIdx*4+1] = ((rgbA[1] * alphA) + rgbB[1]) / alphOut;
                pixels[flipIdx*4+2] = ((rgbA[2] * alphA) + rgbB[2]) / alphOut;

                pixels[flipIdx*4+3] = alphOut * 255.0;
            }
        }
    }

    // Draw the result to the canvas
    ctx.putImageData(this.imageBuffer, 0, 0);

    var readyImage = {
        canvas: this.bgCanvas.el,
        area: [0, 0, this.width, this.height],
        outputSize: [this.width, this.height],
        builder: this.imageBuilder
    };

    this.imageBuilder.emit(this.imageBuilder.IMAGE_READY_TOPIC, readyImage);
}

// --------------------------------------------------------------------------

SortedVolumeCompositor.prototype.destroy = function() {
    this.bgCanvas.destroy();
    this.bgCanvas = null;

    this.queryDataModel = null;
    this.imageBuilder = null;
}
